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

# 3. Yanıt Şeması (User Out / Response)
# API üzerinden kullanıcıya "Hesabın oluştu, işte bilgilerin" dediğimizde
# şifreyi gizleyip ID gibi otomatik oluşan alanları ekliyoruz.
class UserOut(UserBase):
    id: int
    username: str 
    interests: List[CategoryOut] = []  # # Kullanıcının ilgi duyduğu kategorileri bir liste olarak ekliyoruz

    class Config:
        # SQLAlchemy modellerini (class objelerini) Pydantic'in anlayacağı sözlük (dict) yapısına otomatik çevirir.
        from_attributes = True

# 5. Kullanıcı İlgi Alanları Güncelleme Şeması
class UserInterestsUpdate(BaseModel):
    category_ids: List[int]

# --- Haber Şemaları ---

class NewsBase(BaseModel):
    title: str
    category_id: int
    source_url: Optional[str] = None
    image_url: Optional[str] = None   # habere görsel eklemek isteyebiliriz, bu opsiyonel bir alan olabilir. Eğer yoksa frontend'de default bir görsel gösterilir.
    summary: Optional[str] = None

class NewsCreate(NewsBase):
    content: str

class NewsListOut(NewsBase):
    """
    BURAK: Ana sayfada/Listede görünecek hafif paket.
    İçinde 'content' yok, sadece özet ve başlık var.
    """
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class NewsDetailOut(NewsBase):
    """
    BURAK: Habere tıklandığında açılacak ağır paket.
    Burada 'content' (tam metin) geri geliyor.
    """
    id: int
    content: str # Tam metni buraya koyduk!
    created_at: datetime

    class Config:
        from_attributes = True

# --- Podcast Şemaları ---

class PodcastBase(BaseModel):
    title: str
    audio_url: str
    duration: int # Saniye cinsinden, frontend'in oynatıcıyı doğru ayarlaması için gerekli

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

# --- Token Şeması ---
# Login sonrası kullanıcıya döneceğimiz paket
# Sadece Access Token döneceğiz, Refresh Cookie'de saklanacak.
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Pagination Şemaları ---
class PaginationBase(BaseModel):
    total_count: int
    page: int
    size: int

class NewsPagination(PaginationBase):
    items: List[NewsListOut]

class PodcastPagination(PaginationBase):
    items: List[PodcastOut]

# --- Öneri Şeması ---
class SuggestionOut(BaseModel):
    category_id: int
    category_name: str
    message: str # "Örnek: Teknoloji kategorisine çok sık bakıyorsun, ilgini çekebilir!"