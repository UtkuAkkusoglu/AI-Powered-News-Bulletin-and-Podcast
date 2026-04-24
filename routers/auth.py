from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.orm import Session
import models, schemas, utils
from dependencies import db_dependency
from datetime import datetime, timedelta
from typing_extensions import Annotated, Optional

router = APIRouter(
    prefix="/auth",    # Tüm yolların başına otomatik /auth ekler
    tags=["Authentication"] # Swagger dökümanında bunları gruplar
)

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: db_dependency):
    """
    Yeni bir kullanıcı kaydeder.
    1. E-posta kontrolü yapar.
    2. Şifreyi hashler.
    3. Veritabanına kaydeder.
    """
    
    # 1. Email kontrolü
    db_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="This email is already in use!")

    # 2. Username kontrolü
    db_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_username:
        raise HTTPException(status_code=400, detail="This username is already taken, try another one!")
    
    # 3. Şifreyi utils içindeki motorumuzla hashliyoruz
    hashed_pass = utils.hash_password(user.password)
    
    # 4. SQLAlchemy modeline verileri dolduruyoruz
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pass
    )
    
    # 5. Veritabanına ekle ve onayla
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Yeni oluşan ID'yi almak için refresh şart
    
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: db_dependency, response: Response):
    # 1. Kullanıcıyı e-posta ile bul
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    
    # 2. Kullanıcı var mı veya şifre doğru mu diye kontrol et, Giriş işlemlerinde güvenlik gereği genelde "Email yanlış" veya "Şifre yanlış" diye ayrı ayrı detay verilmez. "Bilgiler hatalı" denir ki art niyetli biri hangisinin doğru olduğunu anlamasın. 403, "Yetkin yok, giremezsin" demektir.
    if not user or not utils.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid credentials, no such user exists."
        )
    
    # 3. Payload hazırlıyoruz (sadece user id yeterli)
    token_data = {"sub": str(user.id)}

    # 4. Token'ları üret
    access_token = utils.create_access_token(data=token_data)
    # Ortak metodumuzu çağırıyoruz (Refresh işlerini o halletsin)
    handle_refresh_token_logic(db, response, user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(response: Response, db: db_dependency, refresh_token: Annotated[Optional[str], Cookie()] = None):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    db_token = db.query(models.RefreshToken).filter(models.RefreshToken.token == refresh_token).first()
    
    if not db_token or db_token.expires_at < datetime.utcnow():
        if db_token:
            db.delete(db_token)
            db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

    # Yeni Access Token üret
    new_access_token = utils.create_access_token(data={"sub": str(db_token.user_id)})
    
    # Ortak metodla Rotation yapıyoruz (Eskisini gönderiyoruz ki silsin)
    handle_refresh_token_logic(db, response, db_token.user_id, old_token_obj=db_token)

    return {
        "access_token": new_access_token, 
        "token_type": "bearer"
    }

def handle_refresh_token_logic(db: Session, response: Response, user_id: int, old_token_obj=None):
    """
    Refresh token üretir, DB'ye kaydeder ve Cookie olarak set eder.
    Eğer eski bir token objesi gelirse onu siler (Rotation).
    """
    # 1. Eğer eski bilet varsa veritabanından siliyoruz (Rotation)
    if old_token_obj:
        db.delete(old_token_obj)
    
    # 2. Yeni Refresh Token üret
    new_refresh_token = utils.create_refresh_token(data={"sub": str(user_id)})
    
    # 3. Refresh Token'ı DB'ye kaydet. Böylece ileride blacklist yapabiliriz,
    # yani kullanıcı çıkış yaparken veya token çalındığında bu token'ı geçersiz kılabiliriz.
    # access token'lar genelde blacklist yapılmaz çünkü ömürleri kısa, refresh token'lar uzun ömürlü olduğu için blacklist yapılır.
    new_db_token = models.RefreshToken(
        token=new_refresh_token,
        user_id=user_id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(new_db_token)
    db.commit()
    
    # 4. Tarayıcıya Cookie olarak gönder
    response.set_cookie(
        key="refresh_token", 
        value=new_refresh_token, 
        httponly=True, 
        secure=True, # Lokalde test ediyorsan False yapabilirsin ama prod'da mutlaka True olmalı, böylece sadece HTTPS üzerinden gönderilir ve JS erişemez.
        samesite="lax", 
        max_age=7 * 24 * 60 * 60
    )
    
    return new_refresh_token