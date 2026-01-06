# See Boi Backend

Backend API cho ứng dụng See Boi - nền tảng tích hợp tử vi, nhân tướng, tarot và mạng xã hội được xây dựng bằng NestJS.

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Tính năng chính](#tính-năng-chính)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt và thiết lập](#cài-đặt-và-thiết-lập)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Chạy dự án](#chạy-dự-án)
- [API Documentation](#api-documentation)
- [Các module chính](#các-module-chính)
- [Database](#database)
- [Scripts hữu ích](#scripts-hữu-ích)
- [Testing](#testing)
- [Deployment](#deployment)
- [Đóng góp](#đóng-góp)

## 🎯 Giới thiệu

See Boi Backend là một RESTful API server được xây dựng với NestJS, cung cấp các tính năng:

- **Mạng xã hội**: Quản lý bài viết, bình luận, thẻ tag, bộ sưu tập
- **Tử vi**: Tạo và xem lá số tử vi
- **Nhân tướng**: Phân tích khuôn mặt và đặc điểm nhân tướng
- **Tarot**: Các loại bài tarot (hàng ngày, tình yêu, yes/no, v.v.)
- **AI Integration**: Tích hợp OpenAI và Google Gemini cho các tính năng thông minh
- **Moderation**: Kiểm duyệt nội dung tự động
- **Notifications**: Hệ thống thông báo real-time qua WebSocket

## 🛠 Công nghệ sử dụng

### Core Framework
- **NestJS** (v11.x) - Progressive Node.js framework
- **TypeScript** - Ngôn ngữ lập trình
- **Node.js** - Runtime environment

### Database & ORM
- **PostgreSQL** - Cơ sở dữ liệu quan hệ
- **Prisma** (v6.x) - ORM và database toolkit
- **pg_trgm** - Extension PostgreSQL cho full-text search

### Authentication & Security
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens cho authentication
- **bcrypt** - Mã hóa mật khẩu
- **@nestjs/throttler** - Rate limiting

### File Upload & Storage
- **Cloudinary** - Cloud storage cho hình ảnh
- **Multer** - Middleware xử lý file upload

### AI & External Services
- **OpenAI API** - AI services
- **Google Gemini API** - AI services
- **Python Service** - Dịch vụ phân tích khuôn mặt (MediaPipe)

### Real-time Communication
- **Socket.IO** - WebSocket cho real-time notifications

### Documentation
- **Swagger/OpenAPI** - API documentation

### Utilities
- **class-validator** - Validation decorators
- **class-transformer** - Object transformation
- **lunar-javascript** - Tính toán lịch âm

## ✨ Tính năng chính

### 1. Authentication & Authorization
- Đăng ký/Đăng nhập người dùng
- JWT-based authentication
- Role-based access control (USER, ADMIN)
- Password encryption với bcrypt

### 2. Quản lý người dùng
- CRUD operations cho user
- Profile management
- User badges và achievements
- Follow/Unfollow system

### 3. Bài viết (Posts)
- Tạo, chỉnh sửa, xóa bài viết
- Hỗ trợ rich text (Tiptap JSON format)
- Upload nhiều hình ảnh
- Poll posts (bài viết có bình chọn)
- Post categories
- Visibility settings (PUBLIC, FOLLOWERS, PRIVATE, ANONYMOUS)
- Like và comment system

### 4. Bình luận (Comments)
- Nested comments (reply to comments)
- Comment với hình ảnh
- Comment categories
- Like comments
- Soft delete comments

### 5. Tags & Collections
- Tag system với follow/unfollow
- Collections để tổ chức bài viết
- Tag trending

### 6. Tử vi (Tu Vi)
- Tạo lá số tử vi
- Lưu trữ thông tin lá số
- Tính toán dựa trên ngày sinh, giờ sinh

### 7. Nhân tướng (Physiognomy)
- Phân tích khuôn mặt qua Python service
- Lưu trữ face landmarks
- Phân tích đặc điểm nhân tướng

### 8. Tarot
- Daily tarot reading
- Love tarot (simple & deep)
- Yes/No tarot
- One card tarot

### 9. Notifications
- Real-time notifications qua WebSocket
- Các loại thông báo:
  - POST_LIKE
  - POST_COMMENT
  - COMMENT_LIKE
  - NEW_POST (từ người dùng đang follow)
  - Tag notifications

### 10. Moderation
- Content moderation với AI
- Report system
- Auto-moderation với LLM

### 11. Search
- Full-text search với PostgreSQL pg_trgm
- Search posts, users, tags

### 12. Trending
- Tính toán trending posts
- Trending tags

## 📁 Cấu trúc dự án

```
see_boi_backend/
├── src/
│   ├── auth/                    # Authentication module
│   │   ├── decorator/          # Custom decorators
│   │   ├── dto/                # Data Transfer Objects
│   │   ├── guard/              # Auth guards
│   │   └── strategy/           # Passport strategies
│   ├── modules/                # Feature modules
│   │   ├── user/               # User management
│   │   ├── post/               # Posts
│   │   ├── comment/            # Comments
│   │   ├── tag/                # Tags
│   │   ├── collection/         # Collections
│   │   ├── poll/               # Polls
│   │   ├── badge/              # Badges
│   │   ├── notification/       # Notifications
│   │   ├── report/             # Reports
│   │   ├── tuvi/               # Tử vi
│   │   ├── nhantuong/          # Nhân tướng
│   │   ├── tarot/              # Tarot
│   │   ├── gemini/             # Google Gemini
│   │   ├── openai/             # OpenAI
│   │   ├── upload/             # File upload
│   │   ├── trending/           # Trending
│   │   ├── moderation/         # Content moderation
│   │   └── search/             # Search
│   ├── prisma/                 # Prisma service
│   ├── utils/                  # Utilities
│   │   ├── cloudinary.ts       # Cloudinary config
│   │   ├── content-moderator.ts
│   │   ├── notification.gateway.ts
│   │   └── ...
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Application entry point
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── python_services/            # Python service cho face analysis
│   ├── face_analyzer.py
│   ├── facemesh_handler.py
│   └── main.py
├── dist/                       # Compiled JavaScript
├── test/                       # E2E tests
├── docker-compose.yml          # Docker configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 💻 Yêu cầu hệ thống

- **Node.js**: >= 18.x
- **npm** hoặc **yarn**
- **PostgreSQL**: >= 14.x
- **Docker** và **Docker Compose** (khuyến nghị)
- **Python** 3.8+ (cho Python service)
- **Git**

## 🚀 Cài đặt và thiết lập

### Cách nhanh nhất: Sử dụng script tự động

#### macOS / Linux

**Lần đầu setup:**
```bash
chmod +x setup.sh
./setup.sh
```

**Chạy dự án (sau khi đã setup):**
```bash
chmod +x run.sh
./run.sh
```

#### Windows

**Lần đầu setup:**
```cmd
setup.bat
```

**Chạy dự án (sau khi đã setup):**
```cmd
run.bat
```

### Cài đặt thủ công

#### 1. Clone repository và cài đặt dependencies

```bash
git clone <repository-url>
cd see_boi_backend
npm install
```

#### 2. Thiết lập PostgreSQL với Docker

```bash
docker-compose up -d
```

Hoặc cài đặt PostgreSQL trực tiếp trên máy và tạo database.

#### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc (xem phần [Cấu hình môi trường](#cấu-hình-môi-trường)).

#### 4. Chạy migrations

```bash
# Deploy tất cả migrations
npx prisma migrate deploy

# Hoặc tạo migration mới
npx prisma migrate dev --name <ten_migration>

# Generate Prisma Client
npx prisma generate
```

#### 5. Seed dữ liệu (tùy chọn)

```bash
# Seed users
npx ts-node seed-users.ts

# Import dữ liệu từ seed.sql
# macOS/Linux:
cat seed.sql | docker exec -i my-postgresae psql -U admin -d mydb

# Windows:
Get-Content seed.sql | docker exec -i my-postgresae psql -U admin -d mydb
```

#### 6. Chạy Python service (cho nhân tướng)

```bash
cd python_services
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Hoặc sử dụng script:
```bash
chmod +x run_python.sh
./run_python.sh
```

## ⚙️ Cấu hình môi trường

Tạo file `.env` trong thư mục gốc với nội dung:

```env
# Database
DATABASE_URL="postgresql://admin:admin123@localhost:5432/mydb?schema=public"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRATION="24h"

# Cloudinary (cho upload hình ảnh)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Server
PORT=6789

# OpenAI (cho AI features)
OPENAI_API_KEY="your-openai-api-key"

# Google Gemini (cho AI features)
GEMINI_API_KEY="your-gemini-api-key"

# Python Service (cho nhân tướng)
PYTHON_SERVICE_URL="http://localhost:8000"
```

## 🏃 Chạy dự án

### Development mode

```bash
npm run start:dev
```

Server sẽ chạy tại `http://localhost:6789` (hoặc PORT trong .env)

### Production mode

```bash
# Build project
npm run build

# Run production
npm run start:prod
```

### Debug mode

```bash
npm run start:debug
```

## 📚 API Documentation

Sau khi chạy server, truy cập Swagger UI tại:

```
http://localhost:6789/api
```

Swagger cung cấp:
- Danh sách tất cả endpoints
- Request/Response schemas
- Try it out functionality
- Authentication với Bearer token

### Test endpoint

```bash
curl http://localhost:6789/
```

Response:
```json
{
  "status": "success",
  "message": "Xin chào, tôi là Tùng đẹp trai!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Các module chính

### Auth Module (`/auth`)
- `POST /auth/register` - Đăng ký tài khoản
- `POST /auth/login` - Đăng nhập
- `GET /auth/profile` - Lấy thông tin profile (cần auth)

### User Module (`/users`)
- `GET /users` - Danh sách users
- `GET /users/:id` - Chi tiết user
- `PUT /users/:id` - Cập nhật user
- `POST /users/:id/follow` - Follow user
- `DELETE /users/:id/follow` - Unfollow user

### Post Module (`/posts`)
- `GET /posts` - Danh sách posts (có pagination, filter)
- `GET /posts/:id` - Chi tiết post
- `POST /posts` - Tạo post mới
- `PUT /posts/:id` - Cập nhật post
- `DELETE /posts/:id` - Xóa post
- `POST /posts/:id/like` - Like post
- `POST /posts/:id/comments` - Thêm comment

### Comment Module (`/comments`)
- `GET /comments` - Danh sách comments
- `GET /comments/:id` - Chi tiết comment
- `POST /comments` - Tạo comment
- `PUT /comments/:id` - Cập nhật comment
- `DELETE /comments/:id` - Xóa comment
- `POST /comments/:id/like` - Like comment
- `POST /comments/:id/reply` - Reply comment

### Tag Module (`/tags`)
- `GET /tags` - Danh sách tags
- `GET /tags/:id` - Chi tiết tag
- `POST /tags` - Tạo tag
- `POST /tags/:id/follow` - Follow tag
- `DELETE /tags/:id/follow` - Unfollow tag

### Tu Vi Module (`/tuvi`)
- `POST /tuvi/chart` - Tạo lá số tử vi

### Nhân Tướng Module (`/nhantuong`)
- `POST /nhantuong/analyze` - Phân tích khuôn mặt
- `POST /nhantuong/save` - Lưu kết quả phân tích

### Tarot Module (`/tarot`)
- `POST /tarot/daily` - Bài tarot hàng ngày
- `POST /tarot/love-simple` - Tarot tình yêu đơn giản
- `POST /tarot/love-deep` - Tarot tình yêu chi tiết
- `POST /tarot/yes-no` - Tarot yes/no
- `POST /tarot/one-card` - Rút một lá bài

### Upload Module (`/upload`)
- `POST /upload/image` - Upload hình ảnh
- `POST /upload/images` - Upload nhiều hình ảnh

### Notification Module (`/notifications`)
- `GET /notifications` - Danh sách thông báo
- `PUT /notifications/:id/read` - Đánh dấu đã đọc

### Search Module (`/search`)
- `GET /search` - Tìm kiếm posts, users, tags

### Trending Module (`/trending`)
- `GET /trending/posts` - Posts đang trending
- `GET /trending/tags` - Tags đang trending

## 🗄️ Database

### Prisma Schema

Database schema được định nghĩa trong `prisma/schema.prisma`. Các bảng chính:

- **User** - Thông tin người dùng
- **Post** - Bài viết
- **Comment** - Bình luận
- **Tag** - Thẻ tag
- **Collection** - Bộ sưu tập
- **Poll** - Bình chọn
- **Badge** - Huy hiệu
- **Notification** - Thông báo
- **Report** - Báo cáo
- **TuViChart** - Lá số tử vi
- **UserFaceLandmarks** - Đặc điểm khuôn mặt
- **TagFollow** - Theo dõi tag
- **UserFollow** - Theo dõi user
- Và nhiều bảng khác...

### Migrations

```bash
# Tạo migration mới
npx prisma migrate dev --name <ten_migration>

# Deploy migrations
npx prisma migrate deploy

# Reset database (CẨN THẬN: xóa toàn bộ dữ liệu)
npx prisma migrate reset

# Xem trạng thái migrations
npx prisma migrate status
```

### Prisma Studio

Xem và chỉnh sửa database qua UI:

```bash
npx prisma studio
```

Truy cập tại `http://localhost:5555`

## 📜 Scripts hữu ích

### NPM Scripts

```bash
# Development
npm run start:dev          # Chạy ở chế độ development với watch mode
npm run start:debug        # Chạy ở chế độ debug

# Production
npm run build              # Build project
npm run start:prod         # Chạy production build

# Code quality
npm run lint               # Chạy ESLint
npm run format             # Format code với Prettier

# Testing
npm run test               # Unit tests
npm run test:watch         # Watch mode cho tests
npm run test:cov           # Test coverage
npm run test:e2e           # E2E tests
```

### Database Scripts

```bash
# Prisma
npx prisma generate        # Generate Prisma Client
npx prisma migrate dev     # Tạo và chạy migration
npx prisma migrate deploy  # Deploy migrations
npx prisma studio          # Mở Prisma Studio
npx prisma db push         # Push schema changes (dev only)

# Seed
npx ts-node seed-users.ts  # Seed users
```

### Tạo module mới

```bash
nest g resource modules/<ten-module>
```

Chọn:
- REST API
- Generate CRUD entry points: Yes

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## 🚢 Deployment

### Build cho production

```bash
npm run build
```

### Environment Variables

Đảm bảo cấu hình đúng các biến môi trường trong production:
- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_*`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `PORT`

### Docker Deployment

Có thể sử dụng `docker-compose.yml` để deploy hoặc tạo Dockerfile riêng.

### Vercel Deployment

File `vercel.json` đã được cấu hình sẵn cho Vercel deployment.

## 🔒 Security Features

- **Rate Limiting**: 100 requests/60 seconds
- **Input Validation**: class-validator cho tất cả DTOs
- **Password Hashing**: bcrypt
- **JWT Authentication**: Secure token-based auth
- **CORS**: Cấu hình CORS
- **Content Moderation**: AI-powered content filtering

## 📝 Notes

- Python service cần chạy riêng cho tính năng nhân tướng
- WebSocket notifications cần kết nối qua Socket.IO client
- Cloudinary cần được cấu hình để upload hình ảnh
- PostgreSQL extension `pg_trgm` cần được enable cho full-text search

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

UNLICENSED - Private project

## 👥 Authors

- Development Team

## 📞 Support

Nếu có vấn đề, vui lòng tạo issue trên repository.

---

**Chúc bạn code vui vẻ! 🚀**
