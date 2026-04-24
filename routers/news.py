from fastapi import APIRouter, Depends, HTTPException, status
from typing_extensions import List, Annotated
import schemas, models
from dependencies import db_dependency, get_current_user

router = APIRouter(
    prefix="/news",
    tags=["News"]
)

@router.get("/", response_model=List[schemas.NewsOut])
def get_personalized_news(current_user: Annotated[models.User, Depends(get_current_user)], db: db_dependency):
    """
    ### BURAK (Frontend):
    - Kullanıcının ilgi alanlarına (interests) göre filtrelenmiş haberleri getirir.
    - Eğer kullanıcı hiç ilgi alanı seçmediyse boş liste döner. Bu durumda kullanıcıyı 'Onboarding/Kategori Seçim' ekranına yönlendir.

    ### CIHAN (AI):
    - Veritabanındaki 'news' tablosundan, kullanıcının 'interests' listesiyle eşleşen haberleri çekip dönmelisin.
    - AI özetleri hazır değilse 'summary' alanı null gelebilir, frontend'de bunu handle et.
    """
    # TODO: Cihan buraya kullanıcıya özel filtreleme mantığını ekleyecek.
    return []

@router.post("/{news_id}/click")
def track_news_click(news_id: int, current_user: Annotated[models.User, Depends(get_current_user)], db: db_dependency):
    """
    ### CIHAN:
    - Kullanıcı bir habere tıkladığında bu endpoint tetiklenmeli.
    - 'UserClick' tablosunda sayaç artırılacak.
    - Eğer tıklama sayısı belli bir eşiği geçerse, bu kategoriyi kullanıcıya 'Öneri' olarak sunacağız.
    """

    return {"message": "Click tracked and analytics updated."}