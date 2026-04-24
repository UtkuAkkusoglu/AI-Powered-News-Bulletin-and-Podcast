import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi import Depends
from typing_extensions import Annotated

# .env dosyasındaki değişkenleri yükle
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Veritabanı motorunu oluşturuyoruz
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Veritabanı oturumlarını oluşturacak sınıf
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Modellerin türetildiği temel sınıf
Base = declarative_base()