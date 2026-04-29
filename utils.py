from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from config import settings
from google.cloud import storage
import os

# Ayarları dosya başında değişkenlere atıyoruz
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Passlib'e hangi algoritmayı (bcrypt) kullanacağımızı söylüyoruz ve eski algoritmaların kullanımını devre dışı bırakıyoruz (deprecated="auto").
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    """Ham şifreyi alır ve güvenli bir hash döner."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    """Ham şifre ile hashlenmiş şifreyi karşılaştırır, True/False döner."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy() # Verilen veriyi kopyalayarak yeni bir sözlük oluşturuyoruz, böylece orijinal veri değişmez.
    # Şu anki zaman + ACCESS_TOKEN_EXPIRE_MINUTES dakika
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Payload + Secret Key + Algoritma = Mühürlü JWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    # Şu anki zaman + REFRESH_TOKEN_EXPIRE_DAYS gün
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def upload_to_gcs(file_path: str, destination_blob_name: str):
    """Cihan bu fonksiyonu kullanarak .mp3 dosyalarını GCS'ye yükleyecek."""
    bucket_name = "news-and-podcast-storage" 
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    
    # Dosyayı Frankfurt'taki bucket'a yüklüyoruz
    blob.upload_from_filename(file_path)
    
    # Burak frontend tarafında doğrudan erişebilsin diye public URL'i dönüyoruz
    return f"https://storage.googleapis.com/{bucket_name}/{destination_blob_name}"