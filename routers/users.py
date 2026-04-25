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
    current_user: user_dependency
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

# 4. Yeni Kategori Ekle
@router.post("/categories", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(category: schemas.CategoryCreate, db: db_dependency):
    """
    ### CİHAN:
    - **GÖREV:** AI haberleri kazırken listede olmayan bir kategori belirlerse, bu endpoint'i kullanarak o kategoriyi sisteme kaydetmelisin.
    - İç mantığı (Validation, Duplicate check vb.) sen kendi pipeline'ına göre buraya kurgulayabilirsin.
    - Şimdilik temel kayıt mantığı aşağıdadır:
    """
    new_cat = models.NewsCategory(**category.dict())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

# 5. Kategori Sil
@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: db_dependency):
    """
    ### CİHAN:
    - **GÖREV:** Yanlış açılan veya artık kullanılmayan kategorileri temizlemek senin sorumluluğunda.
    - **DİKKAT:** Foreign Key kısıtlamalarına dikkat et; içinde haber olan kategoriyi silemezsin.
    """
    category = db.query(models.NewsCategory).filter(models.NewsCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    db.delete(category)
    db.commit()
    return None

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