#!/usr/bin/env python3
"""
Türkçe haber kaynaklarından RSS ile haber çeken ve DB'ye kaydeden scraper.

Kullanım:
  python scraper.py
  python scraper.py --limit 20
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup

# ─── Sabitler ─────────────────────────────────────────────────────────────────

SEEN_URLS_FILE = Path(__file__).parent / ".scraper_seen_urls.json"

# Her feed için kategori adı DB'deki CATEGORIES_LIST sırasıyla eşleşmeli:
# Teknoloji, Ekonomi, Spor, Siyaset, Sağlık, Kültür-Sanat,
# Bilim, Otomobil, Oyun, Magazin, Eğitim, Dünya, Türkiye, Gastronomi, Diğer
RSS_SOURCES = [
    {"url": "https://www.ntv.com.tr/teknoloji.rss",    "category_name": "Teknoloji"},
    {"url": "https://www.ntv.com.tr/ekonomi.rss",      "category_name": "Ekonomi"},
    {"url": "https://www.ntv.com.tr/spor.rss",         "category_name": "Spor"},
    {"url": "https://www.ntv.com.tr/turkiye.rss",      "category_name": "Türkiye"},
    {"url": "https://www.ntv.com.tr/dunya.rss",        "category_name": "Dünya"},
    {"url": "https://www.ntv.com.tr/saglik.rss",       "category_name": "Sağlık"},
    {"url": "https://www.ntv.com.tr/bilim.rss",        "category_name": "Bilim"},
    {"url": "https://www.hurriyet.com.tr/rss/magazin", "category_name": "Magazin"},
    {"url": "https://www.hurriyet.com.tr/rss/ekonomi", "category_name": "Ekonomi"},
    {"url": "https://www.hurriyet.com.tr/rss/spor",    "category_name": "Spor"},
]

# İçerik çıkarmak için denenen CSS seçiciler (öncelik sırasıyla)
CONTENT_SELECTORS = [
    "[itemprop='articleBody']",
    "article",
    ".article-content",
    ".news-content",
    ".story-content",
    ".content-text",
    ".article-body",
    "main",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

MIN_CONTENT_LENGTH = 200  # Daha kısa içerikler atlanır
REQUEST_DELAY = 0.5        # Saniye — rate limiting

# ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

def load_seen_urls() -> set:
    """Önceki çalışmalardan kalan URL'leri yükle (tekrar yüklemeyi önler)."""
    if SEEN_URLS_FILE.exists():
        with open(SEEN_URLS_FILE) as f:
            return set(json.load(f))
    return set()


def save_seen_urls(seen: set) -> None:
    with open(SEEN_URLS_FILE, "w") as f:
        json.dump(sorted(seen), f, indent=2)


def extract_content(url: str) -> str | None:
    """Haber sayfasından ana metni çıkarır."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"    [!] İçerik alınamadı: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()

    for selector in CONTENT_SELECTORS:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(separator=" ", strip=True)
            if len(text) >= MIN_CONTENT_LENGTH:
                return text

    # Fallback: uzun <p> taglarını birleştir
    paragraphs = [
        p.get_text(strip=True)
        for p in soup.find_all("p")
        if len(p.get_text(strip=True)) > 50
    ]
    text = " ".join(paragraphs)
    return text if len(text) >= MIN_CONTENT_LENGTH else None


def extract_image(entry) -> str | None:
    """RSS entry'den görsel URL'ini çıkarır."""
    if hasattr(entry, "media_content") and entry.media_content:
        return entry.media_content[0].get("url")
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url")
    return None


def login(api_url: str, email: str, password: str) -> str | None:
    """API'ye giriş yapar, Bearer access_token döner."""
    resp = requests.post(
        f"{api_url}/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if resp.status_code == 200:
        token = resp.json().get("access_token")
        print(f"[Auth] Giriş başarılı: {email}")
        return token
    print(f"[Auth] Giriş başarısız ({resp.status_code}): {resp.text[:200]}")
    return None


def get_category_map(api_url: str, token: str) -> dict[str, int]:
    """Kategori adı → ID sözlüğü döner."""
    resp = requests.get(
        f"{api_url}/categories/",
        headers={"Authorization": f"Bearer {token}"},
    )
    if resp.status_code != 200:
        print(f"[!] Kategoriler alınamadı: {resp.status_code}")
        return {}
    return {cat["name"]: cat["id"] for cat in resp.json()}


def post_news(api_url: str, token: str, payload: dict) -> bool:
    """Haberi /news/ endpoint'ine gönderir."""
    resp = requests.post(
        f"{api_url}/news/",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    if resp.status_code == 201:
        return True
    print(f"    [!] POST /news/ başarısız ({resp.status_code}): {resp.text[:200]}")
    return False


# ─── Ana Akış ─────────────────────────────────────────────────────────────────

def scrape_to_db(limit: int = 0) -> dict:
    """RSS kaynaklarından haber çekip direkt DB'ye kaydeder. Credential gerekmez."""
    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        categories = db.query(models.NewsCategory).all()
        category_map = {cat.name: cat.id for cat in categories}
        if not category_map:
            print("[!] Kategori listesi boş — seed_data çalıştırıldı mı?")
            sys.exit(1)

        seen_urls = load_seen_urls()
        uploaded = skipped_dup = skipped_content = 0

        for source in RSS_SOURCES:
            if limit and uploaded >= limit:
                break

            cat_name = source["category_name"]
            cat_id = category_map.get(cat_name)
            if cat_id is None:
                print(f"\n[RSS] '{cat_name}' kategorisi bulunamadı, atlanıyor.")
                continue

            print(f"\n[RSS] {source['url']}  →  {cat_name} (id={cat_id})")
            feed = feedparser.parse(source["url"])

            if not feed.entries:
                print("  Feed boş veya erişilemiyor.")
                continue

            for entry in feed.entries:
                if limit and uploaded >= limit:
                    break

                source_url = entry.get("link", "").strip()
                if not source_url:
                    continue

                if source_url in seen_urls:
                    skipped_dup += 1
                    continue

                title = entry.get("title", "Başlık Yok").strip()
                print(f"  → {title[:75]}")

                content = extract_content(source_url)
                seen_urls.add(source_url)

                if not content:
                    print("    İçerik çıkarılamadı, atlanıyor.")
                    skipped_content += 1
                    continue

                news = models.News(
                    title=title,
                    content=content,
                    category_id=cat_id,
                    source_url=source_url,
                    image_url=extract_image(entry),
                )
                db.add(news)
                uploaded += 1
                print(f"    ✓ Yüklendi [{uploaded}/{limit or '∞'}]")
                time.sleep(REQUEST_DELAY)

        db.commit()
        save_seen_urls(seen_urls)

        print("\n─── Scraper Tamamlandı ──────────────────────")
        print(f"  Yüklenen : {uploaded}")
        print(f"  Tekrar   : {skipped_dup}")
        print(f"  Atlanan  : {skipped_content}")
        return {"uploaded": uploaded, "skipped_dup": skipped_dup, "skipped_content": skipped_content}

    except Exception as e:
        db.rollback()
        print(f"[!] Hata: {e}")
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="AI News Bulletin — Haber Scraper")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Maksimum yüklenecek haber sayısı (0 = sınırsız)",
    )
    args = parser.parse_args()
    scrape_to_db(args.limit)


if __name__ == "__main__":
    main()
