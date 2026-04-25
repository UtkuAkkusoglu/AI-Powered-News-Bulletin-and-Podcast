import models
from database import SessionLocal, engine

CATEGORIES = [
    "Teknoloji", "Ekonomi", "Spor", "Siyaset", "Sağlık", 
    "Kültür-Sanat", "Bilim", "Otomobil", "Oyun", "Magazin", 
    "Eğitim", "Dünya", "Türkiye", "Gastronomi", "Diğer"
]

def seed_categories(db):
    for cat_name in CATEGORIES:
        exists = db.query(models.NewsCategory).filter_by(name=cat_name).first()
        if not exists:
            db.add(models.NewsCategory(name=cat_name))
    db.commit()