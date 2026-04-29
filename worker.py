import os
from celery import Celery
from utils import upload_to_gcs
# Cihan buraya Gemini ve TTS kütüphanelerini ekleyecek

# Docker-compose içindeki servis adıyla (redis) bağlanıyoruz
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")

celery_app = Celery("tasks", broker=CELERY_BROKER_URL)

# Celery ayarlarını json formatına ve UTC zaman dilimine göre yapıyoruz
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(name="process_news_and_tts")
def process_news_and_tts_task(news_id: int, user_id: int):
    """
    CIHAN BURAYA: 
    1. news_id ile veritabanından haberi çek.
    2. Gemini ile özetle.
    3. Google TTS ile sese çevir.
    4. upload_to_gcs fonksiyonu ile Frankfurt'a yükle.
    5. Dönen linki DB'deki Podcast tablosuna kaydet.
    """
    print(f"--- Arka Plan Görevi Başladı ---")
    print(f"News ID: {news_id} | User ID: {user_id} processing...")
    
    # Cihan burayı dolduracak...
    # Şimdilik simüle ediyoruz
    return {"status": "success", "news_id": news_id}