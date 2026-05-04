from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from typing_extensions import List, Annotated
import schemas, models
from dependencies import db_dependency, user_dependency
from utils import upload_to_gcs, get_signed_audio_url

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

@router.get("/{podcast_id}/audio")
def stream_podcast_audio(podcast_id: int, db: db_dependency, current_user: user_dependency):
    """
    ### BURAK:
    - Podcast sesini çalmak için bu endpoint'i kullan.
    - 1 saatlik geçici bir GCS linki üretir ve oraya yönlendirir (302).
    - Audio player'da src olarak direkt bu URL'yi kullanabilirsin.
    """
    podcast = db.query(models.Podcast).filter(
        models.Podcast.id == podcast_id,
        models.Podcast.user_id == current_user.id,
    ).first()
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast bulunamadı.")

    signed_url = get_signed_audio_url(podcast.audio_url)
    return RedirectResponse(url=signed_url, status_code=302)


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