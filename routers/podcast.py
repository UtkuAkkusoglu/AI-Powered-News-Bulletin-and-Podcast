from fastapi import APIRouter, Depends, HTTPException, status
from typing_extensions import List, Annotated
import schemas, models
from dependencies import db_dependency, get_current_user

router = APIRouter(
    prefix="/podcast",    # Tüm yolların başına otomatik /podcast ekler
    tags=["Podcast"] # Swagger dökümanında bunları gruplar
)

@router.get("/", response_model=List[schemas.PodcastOut])
def get_my_podcasts(current_user: Annotated[models.User, Depends(get_current_user)], db: db_dependency):
    """
    ### CIHAN (AI):
    - Google TTS ile ürettiğin ses dosyalarının URL'lerini 'podcasts' tablosuna kaydetmelisin.
    
    ### BURAK (Frontend):
    - Kullanıcının üretilen bültenlerini burada listeler ve ses oynatıcısını (Audio Player) besler.
    """
    return []