from fastapi import APIRouter, Depends, HTTPException, status
from typing_extensions import List
import models, schemas
from dependencies import db_dependency, user_dependency

router = APIRouter(
    prefix="/users",  # Tüm yolların başına otomatik /users ekler
    tags=["Users"]    # Swagger dökümanında bunları gruplar
)

# 1. Mevcut Kullanıcının Profilini Getir
@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: user_dependency):
    """
    ### BURAK (Frontend):
    - Giriş yapan kullanıcının bilgilerini ve **seçili ilgi alanlarını** getirir.
    - **Kritik:** Eğer 'interests' listesi boş gelirse, bu yeni bir kullanıcıdır. Uygulama açılışında direkt kategori seçim ekranını göster.
    """
    return current_user

# 2. İlgi Alanlarını Güncelle
@router.post("/interests")
def update_interests(
    data: schemas.UserInterestsUpdate, 
    db: db_dependency, 
    current_user: user_dependency
):
    """
    ### BURAK (Frontend):
    - **ZORUNLULUK:** Kullanıcı en az **2 adet** kategori seçmelidir. 
    - **Validasyon:** Şema seviyesinde `min_items=2` kontrolü vardır. 1 tane gönderirsen otomatik hata döner.
    - **UX Notu:** Kullanıcı 2 seçim yapmadan 'Kaydet' butonunu *disabled* (pasif) yaparsan çok şık olur.
    - **Mantık:** Gönderdiğin liste son halidir; listede olmayanlar silinir, yeniler eklenir.
    """

    # Gelen ID'lere göre kategorileri çekiyoruz
    selected_categories = db.query(models.NewsCategory).filter(
        models.NewsCategory.id.in_(data.category_ids)
    ).all()
    
    # Güvenlik Kontrolü: Gönderilen ID sayısı ile DB'den gelen eşleşmeli
    if len(selected_categories) != len(data.category_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Some category IDs were not found in the database."
        )

    # Many-to-Many senkronizasyonu
    current_user.interests = selected_categories
    db.commit()
    
    return {"message": "Interests updated successfully!"}

# 3. Kullanıcıyı Sil
@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(current_user: user_dependency, db: db_dependency):
    """
    ### BURAK (Frontend):
    - Kullanıcı 'Hesabımı Sil' butonuna bastığında bu endpoint'i çağır. 
    - İşlem başarılı olursa kullanıcıyı Logout yap ve Login ekranına at.
    """
    db.delete(current_user)
    db.commit()
    return None # 204 No Content olduğu için bir şey dönmemize gerek yok