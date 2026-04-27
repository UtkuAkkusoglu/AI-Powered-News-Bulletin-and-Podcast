from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # --- Veritabanı Ayarları ---
    # .env içindeki isimlerle birebir aynı olmalı
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    PGDATA: str

    # --- JWT & Güvenlik Ayarları ---
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

    # Pydantic'e .env dosyasını nasıl okuyacağını söylüyoruz
    model_config = SettingsConfigDict(
        env_file=".env",            # Dosya adı
        env_file_encoding="utf-8", # Karakter seti
        extra="ignore"              # .env'de fazla değişken varsa hata verme, görmezden gel
    )

# Uygulama içinde tek bir instance (singleton gibi) kullanmak için nesneyi üretiyoruz
settings = Settings()