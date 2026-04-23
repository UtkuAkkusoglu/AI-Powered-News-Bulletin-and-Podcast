from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, utils
from database import db_dependency

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

@router.post("/login")
def login(user_credentials: schemas.UserLogin, db: db_dependency):
    # 1. Kullanıcıyı e-posta ile bul
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    
    # 2. Kullanıcı var mı veya şifre doğru mu diye kontrol et, Giriş işlemlerinde güvenlik gereği genelde "Email yanlış" veya "Şifre yanlış" diye ayrı ayrı detay verilmez. "Bilgiler hatalı" denir ki art niyetli biri hangisinin doğru olduğunu anlamasın. 403, "Yetkin yok, giremezsin" demektir.
    if not user or not utils.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid credentials, no such user exists."
        )
    
    # 3. Şimdilik sadece başarı mesajı dönelim 
    # (Yarın buraya gerçek bir Token -JWT- ekleyeceğiz)
    return {"message": "Login successful! Welcome back.", "user_id": user.id}