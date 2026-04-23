from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(
    prefix="/news",    # Tüm yolların başına otomatik /news ekler
    tags=["News"] # Swagger dökümanında bunları gruplar
)