from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from config import settings
from google.cloud import storage
from google import genai
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

def _genai_client() -> genai.Client:
    return genai.Client(
        vertexai=True,
        project=settings.GCP_PROJECT_ID,
        location="us-central1",
    )

def get_embedding(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Vertex AI text-embedding-005 ile 768 boyutlu vektör üretir."""
    client = _genai_client()
    response = client.models.embed_content(
        model="publishers/google/models/text-embedding-005",
        contents=text,
    )
    return response.embeddings[0].values


def get_signed_audio_url(gcs_url: str, expiration_minutes: int = 60) -> str:
    """GCS URL'inden 1 saatlik geçici imzalı link üretir."""
    from google.oauth2 import service_account
    from datetime import timedelta

    bucket_name = "news-and-podcast-storage"
    blob_name = gcs_url.split(f"{bucket_name}/")[-1]

    credentials = service_account.Credentials.from_service_account_file(
        settings.GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    storage_client = storage.Client(credentials=credentials)
    blob = storage_client.bucket(bucket_name).blob(blob_name)
    return blob.generate_signed_url(
        expiration=timedelta(minutes=expiration_minutes),
        method="GET",
        version="v4",
        credentials=credentials,
    )


def upload_to_gcs(file_path: str, destination_blob_name: str):
    """Cihan bu fonksiyonu kullanarak .mp3 dosyalarını GCS'ye yükleyecek."""
    bucket_name = "news-and-podcast-storage" 
    storage_client = storage.Client()  # kod çalıştığında GOOGLE_APPLICATION_CREDENTIALS ortam değişkeninden otomatik olarak kimlik bilgilerini alır
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    
    # Dosyayı Frankfurt'taki bucket'a yüklüyoruz
    blob.upload_from_filename(file_path)
    
    # Burak frontend tarafında doğrudan erişebilsin diye public URL'i dönüyoruz
    return f"https://storage.googleapis.com/{bucket_name}/{destination_blob_name}"