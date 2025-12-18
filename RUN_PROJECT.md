# Hướng dẫn cài đặt & chạy dự án

## 1. Cài đặt dependencies

```bash
cd backend
npm install
```

## 2. Tạo file .env

Tạo file `.env` với nội dung mẫu:
```
DATABASE_URL="postgresql://admin:admin123@localhost:5432/mydb?schema=public"
JWT_SECRET="bi_mat_khong_bat_mi"
JWT_EXPIRATION="24h"
CLOUDINARY_CLOUD_NAME="dzvvhdqoq"
CLOUDINARY_API_KEY="825185866658749"
CLOUDINARY_API_SECRET="cWyG16b5AcH1pdfTMQHzKMtHTN8"
```

## 3. Chạy container PostgreSQL

```bash
docker-compose up -d
```

## 4. Migration database

- Tạo migration mới:
  ```bash
  npx prisma migrate dev --name <ten_migration_cua_ban>
  ```
- Deploy migration đã có và generate lại Prisma Client:
  ```bash
  npx prisma migrate deploy
  npx prisma generate
  ```

## 5. Import dữ liệu

- Import user qua seed script:
  ```bash
  npx ts-node seed-users.ts
  ```
- Import dữ liệu từ file seed.sql:
  - **Windows:**
    ```bash
    Get-Content seed.sql | docker exec -i my-postgresae psql -U admin -d mydb
    ```
  - **macOS/Linux:**
    ```bash
    cat seed.sql | docker exec -i my-postgresae psql -U admin -d mydb
    ```

## 6. Chạy project

```bash
nest start --watch
```

## 7. Truy cập database qua docker exec

```bash
docker exec -it my-postgresae psql -U admin -d mydb
```

## 8. Tạo module mới

```bash
nest g resource modules/<tên module>
```
> Chọn REST và generate CRUD khi được hỏi.

---

**Chúc bạn thành công!**