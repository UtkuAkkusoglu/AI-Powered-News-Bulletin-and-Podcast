from fastapi import APIRouter, Depends, HTTPException, status
from typing_extensions import Optional
import schemas, models
from dependencies import db_dependency, user_dependency

router = APIRouter(
    prefix="/news",
    tags=["News"]
)

@router.get("/", response_model=schemas.NewsPagination)
def get_news(
    db: db_dependency, 
    current_user: user_dependency,
    page: int = 1, 
    size: int = 10,
    search: Optional[str] = None, 
    category_id: Optional[int] = None 
):
    """
    ### BURAK (Frontend):
    - Ana haber akışını ve aramayı buradan yönetirsin.
    
    ### CIHAN (AI):
    - 'search' parametresi dolu gelirse, buraya yazdığın AI tabanlı arama motoru (Embedding + Vector Search) devreye girecek.
    - Şimdilik basit bir 'Title Search' var.
    """
    query = db.query(models.News)
    
    # Kategori Filtresi
    if category_id:
        query = query.filter(models.News.category_id == category_id)

    # Arama Filtresi (Cihan burayı AI tabanlı yapacak)
    if search:
        # Şimdilik basit arama, Cihan gelince burası 'vector_search(search)' olacak
        query = query.filter(models.News.title.contains(search))

    total_count = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total_count": total_count,
        "page": page,
        "size": size
    }

@router.post("/", response_model=schemas.NewsDetailOut, status_code=status.HTTP_201_CREATED)
def create_news(news: schemas.NewsCreate, db: db_dependency):
    """
    ### CIHAN (AI & Data Pipeline):
    - Kazıdığın (Scraping) haberleri bu endpoint ile sisteme yükleyeceksin.
    - Gemini ile oluşturduğun 'summary' bilgisini de buraya gönder.
    - 'category_id' gönderirken dikkatli ol, kategori tablosundaki ID'lerle eşleşmeli.
    """
    new_news = models.News(**news.dict())
    db.add(new_news)
    db.commit()
    db.refresh(new_news)
    return new_news

@router.post("/{news_id}/click")
def track_news_click(news_id: int, current_user: user_dependency, db: db_dependency):
    """
    ### BURAK (Frontend):
    - **DİKKAT:** Kullanıcı bir habere tıkladığı an bu endpoint'i TETİKLE.
    - **Akıllı Sistem:** Arka planda kullanıcının hangi kategoriye kaç kere tıkladığını sayıyorum.
    - **Öneri:** Eğer yanıtın içinde `suggestion` objesi gelirse (Null değilse), bu kullanıcı 5 tıkı geçti demektir. 
    - **Aksiyon:** Ekranda "Bu kategori (Örn: Spor) ilgini çekiyor gibi, ekleyelim mi?" diye bir pop-up çıkar.
    """

    # 1. Haberi bul ki kategorisini öğrenelim
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Haber bulunamadı.")

    # 2. Bu kullanıcının bu kategori için bir click kaydı var mı?
    click_record = db.query(models.UserClick).filter(
        models.UserClick.user_id == current_user.id,
        models.UserClick.category_id == news.category_id
    ).first()

    if click_record:
        click_record.click_count += 1
    else:
        # İlk defa tıklıyorsa yeni kayıt aç
        click_record = models.UserClick(
            user_id=current_user.id,
            category_id=news.category_id,
            click_count=1
        )
        db.add(click_record)

    db.commit()

    # 3. Öneri Mantığı: 5 tık olduysa ve daha önce önermediysek (Örn: Limit=5)
    if click_record.click_count >= 5 and not click_record.is_suggested:
        is_already_interest = any(cat.id == news.category_id for cat in current_user.interests)
        if not is_already_interest:
            # Öneriyi gönderiyoruz ve 'is_suggested'ı True yapıyoruz ki bir daha darlamayalım.
            click_record.is_suggested = True
            db.commit()
            return {
                "suggestion": {
                    "id": news.category_id,
                    "name": news.category.name,
                    "message": f"{news.category.name} kategorisine olan ilginin farkındayız!"
                }
            }

    return {"suggestion": None, "message": "Click tracked."}

@router.get("/{news_id}", response_model=schemas.NewsDetailOut)
def get_news_detail(news_id: int, db: db_dependency, current_user: user_dependency):
    """
    ### BURAK (Frontend):
    - Haberin tüm detaylarını (tam metin, özet, resim vb.) buradan çekersin.
    - Habere tıklandığı an bu endpoint ile birlikte 'POST /news/{id}/click' endpoint'ini de tetiklemeyi unutma!
    """
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found!")
    return news