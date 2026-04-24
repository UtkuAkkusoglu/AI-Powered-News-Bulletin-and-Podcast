from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from jose import jwt
from datetime import datetime, timedelta

# .env dosyasını yükleyelim
load_dotenv()

# Passlib'e hangi algoritmayı (bcrypt) kullanacağımızı söylüyoruz ve eski algoritmaların kullanımını devre dışı bırakıyoruz (deprecated="auto").
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    """Ham şifreyi alır ve güvenli bir hash döner."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    """Ham şifre ile hashlenmiş şifreyi karşılaştırır, True/False döner."""
    return pwd_context.verify(plain_password, hashed_password)

# JWT ayarları
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

def create_access_token(data: dict):
    to_encode = data.copy() # Verilen veriyi kopyalayarak yeni bir sözlük oluşturuyoruz, böylece orijinal veri değişmez.
    # Şu anki zaman + ACCESS_TOKEN_EXPIRE_MINUTES dakika
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Payload + Secret Key + Algoritma = Mühürlü JWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    # Şu anki zaman + REFRESH_TOKEN_EXPIRE_DAYS gün
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt