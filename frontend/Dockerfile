# 1. Node.js motorunu Docker'ın içine alıyoruz
FROM node:20-alpine

# 2. Çalışma dizinini belirliyoruz
WORKDIR /app

# 3. Önce sadece paket listesini kopyalayıp kütüphaneleri indiriyoruz (Hız için)
COPY package*.json ./
RUN npm install

# 4. Geri kalan tüm frontend kodlarını kopyalıyoruz
COPY . .

# 5. Vite'ın varsayılan portu olan 5173'ü dışarı açıyoruz
EXPOSE 5173

# 6. Uygulamayı dışarıdan erişilecek şekilde başlatıyoruz
# Cloud Run portu ne verirse o portta yayına alması için preview komutunu esnetiyoruz
CMD ["npm", "run", "preview", "--", "--port", "8080", "--host"]