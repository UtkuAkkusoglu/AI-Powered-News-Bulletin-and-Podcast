from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # --- Veritabanı Ayarları ---
    # .env içindeki isimlerle birebir aynı olmalı
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str = "news_and_podcast"
    PGDATA: str = "/var/lib/postgresql/data/pgdata"

    # --- JWT & Güvenlik Ayarları ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Google Cloud & Celery Ayarları ---
    GOOGLE_APPLICATION_CREDENTIALS: str = "gcp-service-account.json"  # localde bu dosya ile çalışacağız, Cloud Run'da ise bizim ona verdiğimiz news-and-podcast-sa service account'u kullanacak
    CELERY_BROKER_URL: str
    GCP_PROJECT_ID: str = "project-9b6d702e-bc81-4d20-aff"
    GCP_BUCKET_NAME: str
    GCP_LOCATION: str = "europe-west3"

    # Pydantic'e .env dosyasını nasıl okuyacağını söylüyoruz
    model_config = SettingsConfigDict(
        env_file=".env",            # Dosya adı
        env_file_encoding="utf-8", # Karakter seti
        extra="ignore"              # .env'de fazla değişken varsa hata verme, görmezden gel
    )

# Uygulama içinde tek bir instance (singleton gibi) kullanmak için nesneyi üretiyoruz
settings = Settings()