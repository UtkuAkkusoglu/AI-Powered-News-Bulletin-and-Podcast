from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime, timezone

# ==========================================
# 1. ARA TABLO (KÖPRÜ / JUNCTION TABLE)  - Many-to-Many ilişkilerde kullanılır.
# ==========================================
# Bu tablo veritabanında fiziksel olarak oluşur ama biz kodda buna doğrudan dokunmayız.
# Sadece "Hangi kullanıcı hangi kategoriyi seviyor?" eşleşmesini tutan bir listedir.
user_interests = Table(
    "user_interests",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # ==========================================
    # İLİŞKİLER (RELATIONSHIPS)
    # ==========================================
    
    # [ONE-TO-MANY]: Bir kullanıcının birden fazla podcasti olabilir.
    # - "Podcast": Bağlanılan sınıfın adı.
    # - back_populates="owner": Podcast sınıfındaki 'owner' değişkeniyle bu değişken el sıkışıyor. 
    #   Yani john.podcasts deyince liste gelir, podcast.owner deyince john gelir.
    podcasts = relationship("Podcast", back_populates="owner")

    # [MANY-TO-MANY]: Kullanıcı ve Kategori arasındaki çoktan-çoğa ilişki.
    # - secondary=user_interests: "SQLAlchemy, bu verilere ulaşmak için aradaki köprü tabloyu kullan!"
    #   Bu sayede john.interests deyince doğrudan NewsCategory objeleri listelenir.
    interests = relationship("NewsCategory", secondary=user_interests)

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text) # AI tarafından özetlenmiş hali
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    source_url = Column(String)
    image_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("NewsCategory") # Relationship sayesinde isme ulaşacağız

class Podcast(Base):
    __tablename__ = "podcasts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    audio_url = Column(String, nullable=False) # Cloud Storage (GCP) üzerindeki dosya yolu
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration = Column(Integer, nullable=False) # Saniye cinsinden

    owner = relationship("User", back_populates="podcasts")

class NewsCategory(Base):
    """Sistemdeki mevcut kategorileri tutan basit bir tablo, id olmasa da olurdu çünkü name, unique ve primary key olabilir ama arama yaparken id(sayısal) daha hızlı olur."""
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # "Teknoloji", "Siyaset" vb.

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Kullanıcı silindiğinde ona ait refresh token'lar da silinsin(CASCADE)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # Token'ın ne zaman oluşturulduğu bilgisi, ileride blacklist yaparken veya token'ların ömrünü yönetirken faydalı olabilir.

class UserClick(Base):
    __tablename__ = "user_clicks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    click_count = Column(Integer, default=1)
    last_click_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_suggested = Column(Boolean, default=False)

    # İlişkiler
    user = relationship("User")
    category = relationship("NewsCategory")