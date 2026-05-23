from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import models
from dependencies import db_dependency, user_dependency
from sqlalchemy.exc import IntegrityError
import feedparser
import concurrent.futures
from datetime import datetime, timezone

router = APIRouter(prefix="/rss-reader", tags=["RSS Reader"])


class ListCreate(BaseModel):
    name: str


class FeedAdd(BaseModel):
    url: str


def _fetch_feed(url: str, feed_title: str) -> list[dict]:
    """Fetch and parse a single RSS feed, return article dicts."""
    try:
        parsed = feedparser.parse(url)
        articles = []
        for entry in parsed.entries[:30]:
            pub = entry.get("published_parsed") or entry.get("updated_parsed")
            if pub:
                dt = datetime(*pub[:6], tzinfo=timezone.utc).isoformat()
            else:
                dt = None
            articles.append({
                "title": entry.get("title", "Başlık yok"),
                "link": entry.get("link", ""),
                "summary": entry.get("summary", ""),
                "published": dt,
                "feed_title": feed_title or parsed.feed.get("title", url),
                "feed_url": url,
            })
        return articles
    except Exception:
        return []


# ── List CRUD ──────────────────────────────────────────────────────────────────

@router.get("/lists")
def get_lists(db: db_dependency, current_user: user_dependency):
    lists = (
        db.query(models.UserRssList)
        .filter(models.UserRssList.user_id == current_user.id)
        .order_by(models.UserRssList.created_at)
        .all()
    )
    return [
        {
            "id": lst.id,
            "name": lst.name,
            "feed_count": len(lst.feeds),
            "feeds": [{"id": f.id, "url": f.url, "title": f.title} for f in lst.feeds],
        }
        for lst in lists
    ]


@router.post("/lists", status_code=status.HTTP_201_CREATED)
def create_list(body: ListCreate, db: db_dependency, current_user: user_dependency):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Liste adı boş olamaz.")
    lst = models.UserRssList(user_id=current_user.id, name=body.name.strip())
    db.add(lst)
    db.commit()
    db.refresh(lst)
    return {"id": lst.id, "name": lst.name, "feed_count": 0, "feeds": []}


@router.patch("/lists/{list_id}")
def rename_list(list_id: int, body: ListCreate, db: db_dependency, current_user: user_dependency):
    lst = db.query(models.UserRssList).filter(
        models.UserRssList.id == list_id,
        models.UserRssList.user_id == current_user.id,
    ).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")
    lst.name = body.name.strip()
    db.commit()
    return {"id": lst.id, "name": lst.name}


@router.delete("/lists/{list_id}", status_code=status.HTTP_200_OK)
def delete_list(list_id: int, db: db_dependency, current_user: user_dependency):
    lst = db.query(models.UserRssList).filter(
        models.UserRssList.id == list_id,
        models.UserRssList.user_id == current_user.id,
    ).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")
    db.delete(lst)
    db.commit()
    return {"message": "Liste silindi."}


# ── Feed CRUD ──────────────────────────────────────────────────────────────────

@router.post("/lists/{list_id}/feeds", status_code=status.HTTP_201_CREATED)
def add_feed(list_id: int, body: FeedAdd, db: db_dependency, current_user: user_dependency):
    lst = db.query(models.UserRssList).filter(
        models.UserRssList.id == list_id,
        models.UserRssList.user_id == current_user.id,
    ).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")

    url = str(body.url).strip()

    # Duplicate check
    existing = next((f for f in lst.feeds if f.url == url), None)
    if existing:
        raise HTTPException(status_code=409, detail="Bu kaynak zaten listede.")

    # Auto-detect feed title
    feed_title = None
    try:
        parsed = feedparser.parse(url)
        feed_title = parsed.feed.get("title") or None
    except Exception:
        pass

    feed = models.UserRssFeed(list_id=list_id, url=url, title=feed_title)
    db.add(feed)
    db.commit()
    db.refresh(feed)
    return {"id": feed.id, "url": feed.url, "title": feed.title}


@router.delete("/lists/{list_id}/feeds/{feed_id}", status_code=status.HTTP_200_OK)
def remove_feed(list_id: int, feed_id: int, db: db_dependency, current_user: user_dependency):
    feed = db.query(models.UserRssFeed).join(models.UserRssList).filter(
        models.UserRssFeed.id == feed_id,
        models.UserRssFeed.list_id == list_id,
        models.UserRssList.user_id == current_user.id,
    ).first()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed bulunamadı.")
    db.delete(feed)
    db.commit()
    return {"message": "Feed kaldırıldı."}


# ── Articles (live fetch) ──────────────────────────────────────────────────────

@router.get("/lists/{list_id}/articles")
def get_articles(list_id: int, db: db_dependency, current_user: user_dependency):
    lst = db.query(models.UserRssList).filter(
        models.UserRssList.id == list_id,
        models.UserRssList.user_id == current_user.id,
    ).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")

    if not lst.feeds:
        return []

    # Fetch all feeds concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(_fetch_feed, f.url, f.title) for f in lst.feeds]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    articles = [item for sublist in results for item in sublist]
    articles.sort(key=lambda a: a["published"] or "", reverse=True)
    return articles
