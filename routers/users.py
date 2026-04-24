from fastapi import APIRouter, Depends, HTTPException, status
from typing_extensions import List, Annotated
import models, schemas
from dependencies import db_dependency, get_current_user

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# 1. Mevcut Kullanıcının Profilini Getir
@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: Annotated[models.User, Depends(get_current_user)]):
    """
    ### BURAK (Frontend):
    - Giriş yapan kullanıcının bilgilerini ve **seçili ilgi alanlarını** getirir.
    - **Kritik:** Eğer 'interests' listesi boş gelirse, bu yeni bir kullanıcıdır. Uygulama açılışında direkt kategori seçim ekranını göster.
    """
    return current_user

# 2. Tüm Kategorileri Listele
@router.get("/categories", response_model=List[schemas.CategoryOut])
def get_categories(db: db_dependency):
    """
    Kullanıcının seçim yapabilmesi için sistemdeki tüm kategorileri getirir.
    """
    return db.query(models.NewsCategory).all()

# 3. İlgi Alanlarını Güncelle
@router.post("/interests")
def update_interests(
    data: schemas.UserInterestsUpdate, 
    db: db_dependency, 
    current_user: Annotated[models.User, Depends(get_current_user)]
):
    """
    ### BURAK (Frontend):
    - Hem ilk kayıt sonrası hem de 'Profilim' sayfasındaki kategori güncellemeleri için kullanılır.
    - Gönderdiğin liste, kullanıcının ilgi alanlarının **son halidir**. Listede olmayanlar silinir, yeni olanlar eklenir.
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