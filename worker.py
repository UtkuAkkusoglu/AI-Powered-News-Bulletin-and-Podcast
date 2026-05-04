from celery import Celery
from config import settings
from utils import upload_to_gcs, get_embedding
import google.generativeai as genai
from google.cloud import texttospeech
from database import SessionLocal
import models
import os

CELERY_BROKER_URL = settings.CELERY_BROKER_URL

celery_app = Celery("tasks", broker=CELERY_BROKER_URL)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(name="process_news_and_tts")
def process_news_and_tts_task(news_id: int, user_id: int):
    db = SessionLocal()
    tmp_path = f"/tmp/news_{news_id}.mp3"
    try:
        # 1. DB'den haberi çek
        news = db.query(models.News).filter(models.News.id == news_id).first()
        if not news:
            print(f"[Worker] News {news_id} bulunamadı, görev iptal edildi.")
            return {"status": "error", "message": f"News {news_id} not found"}

        print(f"[Worker] Haber bulundu: '{news.title}' — Gemini ile özetleniyor...")

        # 2. Gemini API ile özetle
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            "Aşağıdaki haberi Türkçe olarak 3-4 cümleyle özetle. "
            "Özet podcast için sesli okunacağından doğal bir konuşma diliyle yaz, "
            "madde işareti veya başlık kullanma:\n\n"
            f"{news.content}"
        )
        gemini_response = model.generate_content(prompt)
        summary = gemini_response.text.strip()

        # Özeti News tablosuna kaydet
        news.summary = summary
        db.commit()
        print(f"[Worker] Özet oluşturuldu ve kaydedildi ({len(summary.split())} kelime).")

        # Embedding üret ve kaydet (başlık + içerik)
        print("[Worker] Embedding üretiliyor...")
        embedding_text = f"{news.title}\n\n{news.content}"
        news.embedding = get_embedding(embedding_text, task_type="retrieval_document")
        db.commit()
        print("[Worker] Embedding kaydedildi.")

        # 3. Google TTS ile .mp3 üret
        print("[Worker] Google TTS ile ses üretiliyor...")
        tts_client = texttospeech.TextToSpeechClient()
        synthesis_input = texttospeech.SynthesisInput(text=summary)
        voice = texttospeech.VoiceSelectionParams(
            language_code="tr-TR",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        tts_response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        with open(tmp_path, "wb") as f:
            f.write(tts_response.audio_content)
        print(f"[Worker] Ses dosyası oluşturuldu: {tmp_path}")

        # 4. GCS Frankfurt bucket'ına yükle
        destination_blob = f"podcasts/news_{news_id}.mp3"
        audio_url = upload_to_gcs(tmp_path, destination_blob)
        print(f"[Worker] GCS'ye yüklendi: {audio_url}")

        # 5. Duration hesapla (yaklaşık 150 kelime/dakika)
        word_count = len(summary.split())
        duration_seconds = max(1, int(word_count / 150 * 60))

        # 6. Podcast tablosuna kaydet
        podcast = models.Podcast(
            title=news.title,
            audio_url=audio_url,
            user_id=user_id,
            duration=duration_seconds,
        )
        db.add(podcast)
        db.commit()
        print(f"[Worker] Podcast kaydedildi — ID: {podcast.id}, süre: {duration_seconds}s")

        return {"status": "success", "news_id": news_id, "audio_url": audio_url}

    except Exception as e:
        db.rollback()
        print(f"[Worker] HATA — news_id={news_id}: {e}")
        return {"status": "error", "message": str(e)}

    finally:
        db.close()
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
