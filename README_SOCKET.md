# Hướng dẫn Socket Notification cho Frontend

## 1. Tổng quan
Dự án backend đã tích hợp WebSocket (sử dụng Socket.IO) để gửi thông báo realtime cho các sự kiện:
- Có thông báo mới (notification)
- Có comment mới (comment)
- Có like mới (like)
- Có bài đăng mới từ người bạn theo dõi (new_post)

## 2. Cách kết nối từ Frontend

### Kết nối socket
```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000'); // Thay bằng URL backend
```

### Join room theo userId (sau khi đăng nhập)
```js
socket.emit('join', userId); // userId là id của user đã đăng nhập
```

### Lắng nghe các sự kiện
```js
socket.on('notification', (data) => {
  // Xử lý khi có notification mới
});

socket.on('comment', (data) => {
  // Xử lý khi có comment mới
});

socket.on('like', (data) => {
  // Xử lý khi có like mới
});
```

### Lắng nghe bài đăng mới từ người theo dõi
- Sự kiện này cũng trả về qua `notification` với type là `NEW_POST`.
- Khi nhận được notification có `type: 'NEW_POST'`, FE có thể hiển thị thông báo: "Người bạn theo dõi vừa đăng bài mới..."

## 3. Lưu ý
- FE cần join room đúng userId để nhận thông báo cá nhân.
- Nếu user đăng xuất, nên disconnect socket hoặc rời room.
- Các notification realtime chỉ gửi cho user liên quan (chủ bài viết, chủ comment, followers...)

## 4. Ví dụ xử lý notification NEW_POST
```js
socket.on('notification', (data) => {
  if (data.type === 'NEW_POST') {
    // Hiển thị popup hoặc badge thông báo bài đăng mới từ người theo dõi
  }
});
```

## 5. Tham khảo
- Socket gateway: `src/utils/notification.gateway.ts`
- Gửi notification khi tạo bài viết: `src/modules/post/post.service.ts`
- Enum type notification: `prisma/schema.prisma`

---
Nếu cần thêm ví dụ hoặc hỗ trợ về FE, hãy liên hệ backend team.
