from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- Kategori Şemaları ---

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    # Kategori oluştururken sadece isim (name) yeterli.
    pass

class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# --- Kullanıcı Şemaları ---

# 1. Base Şema (Ortak Alanlar)
# Her iki yönde de (giriş-çıkış) ortak olan alanları burada topluyoruz.
class UserBase(BaseModel):
    email: EmailStr

# 2. Kayıt Şeması (User Create)
# Kullanıcı kayıt olurken ekstra olarak şifre ve username göndermeli.
class UserCreate(UserBase):
    username: str
    password: str

# 3. Giriş yaparken email haricinde şifre lazım
class UserLogin(UserBase):
    password: str

# 4. Yanıt Şeması (User Out / Response)
# API üzerinden kullanıcıya "Hesabın oluştu, işte bilgilerin" dediğimizde
# şifreyi gizleyip ID gibi otomatik oluşan alanları ekliyoruz.
class UserOut(UserBase):
    id: int
    interests: List[CategoryOut] = []  # # Kullanıcının ilgi duyduğu kategorileri bir liste olarak ekliyoruz

    class Config:
        # SQLAlchemy modellerini (class objelerini) Pydantic'in anlayacağı sözlük (dict) yapısına otomatik çevirir.
        from_attributes = True

# --- Haber Şemaları ---
class NewsBase(BaseModel):
    title: str
    content: str
    category: str
    source_url: Optional[str] = None

class NewsCreate(NewsBase):
    pass # Haber oluştururken ekstra bir alan (şifre gibi) gerekmediği için Base'i aynen kullanıyoruz.

class NewsOut(NewsBase):
    id: int
    summary: Optional[str] = None # Başta boş olabilir, AI sonra dolduracak
    created_at: datetime # Haberin ne zaman oluşturulduğu bilgisi, API'den çıktı verirken faydalı olabilir.

    class Config:
        from_attributes = True

# --- Podcast Şemaları ---

class PodcastBase(BaseModel):
    title: str
    audio_url: str

class PodcastCreate(PodcastBase):
    # Podcast oluştururken ekstra bir alan gerekmiyor.
    # user_id'yi(kimin için üretildiği bilgisi) genellikle endpoint'te o an giriş yapmış 
    # olan kullanıcıdan otomatik alacağımız için buraya yazmıyoruz.
    pass

class PodcastOut(PodcastBase):
    id: int
    user_id: int
    created_at: datetime  # Podcast'in ne zaman oluşturulduğu bilgisi, API'den çıktı verirken faydalı olabilir.

    class Config:
        from_attributes = True

# --- Token Şemaları ---

# Login sonrası kullanıcıya döneceğimiz paket
# Sadece Access Token döneceğiz, Refresh Cookie'de saklanacak.
class Token(BaseModel):
    access_token: str
    token_type: str