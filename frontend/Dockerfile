# 1. Node.js motorunu Docker'ın içine alıyoruz
FROM node:20-alpine

# 2. Çalışma dizinini belirliyoruz
WORKDIR /app

# 3. Önce sadece paket listesini kopyalayıp kütüphaneleri indiriyoruz (Hız için)
COPY package*.json ./
RUN npm install

# 4. Geri kalan tüm frontend kodlarını kopyalıyoruz
COPY . .

# 5. Projeyi production modunda derle (dist klasörü hatasız oluşsun)
RUN npm run build

# 6. Statik dosyaları en hafif ve kararlı şekilde sunacak paketi küresel yüklüyoruz
RUN npm install -g sirv-cli

# 7. Cloud Run için standart portu açıyoruz
EXPOSE 8080

# 8. Derlenen dist klasörünü, Cloud Run'ın dayattığı portta doğrudan dünyaya açıyoruz
CMD ["sh", "-c", "sirv dist --port ${PORT:-8080} --host --single"]