from fastapi import APIRouter, Depends, HTTPException, status
from typing_extensions import List, Annotated
import schemas, models
from dependencies import db_dependency, user_dependency
from utils import upload_to_gcs

router = APIRouter(
    prefix="/podcast",    # Tüm yolların başına otomatik /podcast ekler
    tags=["Podcast"] # Swagger dökümanında bunları gruplar
)

@router.get("/", response_model=schemas.PodcastPagination) 
def get_my_podcasts(
    current_user: user_dependency, 
    db: db_dependency,
    page: int = 1,
    size: int = 10
):
    """
    ### BURAK:
    - Kullanıcının ürettiği podcastleri sayfalı olarak getirir.
    """
    offset = (page - 1) * size
    query = db.query(models.Podcast).filter(models.Podcast.user_id == current_user.id)
    
    total_count = query.count()
    items = query.order_by(models.Podcast.created_at.desc()).offset(offset).limit(size).all()
    
    return {
        "items": items,
        "total_count": total_count,
        "page": page,
        "size": size
    }

@router.post("/", response_model=schemas.PodcastOut, status_code=status.HTTP_201_CREATED)
def create_podcast(podcast: schemas.PodcastCreate, db: db_dependency, current_user: user_dependency):
    """
    ### CIHAN (AI & Pipeline):
    - **Adım 1:** Gemini ile özeti oluştur ve Google TTS ile .mp3 dosyasını üret.
    - **Adım 2:** Ürettiğin dosyayı `utils.upload_to_gcs` fonksiyonu ile Frankfurt'a gönder.
    - **Adım 3:** GCS'den dönen URL'yi bu endpoint'e 'audio_url' olarak post et.

    Örnek Akış (Logic):
    ------------------
    # file_name = f"podcasts/user_{current_user.id}_{datetime.now().timestamp()}.mp3"
    # public_url = upload_to_gcs(file_path="local_temp_audio.mp3", destination_blob_name=file_name)
    # podcast.audio_url = public_url
    """
    
    new_podcast = models.Podcast(
        **podcast.dict(),
        user_id=current_user.id
    )

    db.add(new_podcast)
    db.commit()
    db.refresh(new_podcast)
    return new_podcast