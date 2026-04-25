from fastapi import FastAPI
from routers import auth, news, podcast, users  # Routers klasöründen çekiyoruz
from database import engine, SessionLocal
import models
from seed_data import seed_categories

app = FastAPI(
    title="AI-Powered News Bulletin and Podcast API",
    description="A 12-factor API that summarizes news and creates podcasts.",
)

# Startup Event: Uygulama ayağa kalkarken çalışır
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_categories(db) # Kategorileri kontrol et ve eksikse ekle
    finally:
        db.close()

# Proje başladığında tabloları kontrol eder/oluşturur
# (Biz Alembic kullanıyoruz, bu güvenlik önlemi olarak kalabilir ama veritabanındaki değişiklikler için Alembic migration'ları yazarken bu kodu kullanmayacağız)
models.Base.metadata.create_all(bind=engine)

# Router'ları uygulamaya dahil et
app.include_router(auth.router)
app.include_router(news.router)
app.include_router(podcast.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"status": "active", "message": "System is ready!"}
