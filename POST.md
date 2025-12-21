# Post API Routes & Spec (See Boi Backend)

Tài liệu này tổng hợp **các endpoint liên quan đến Post** để team giao diện triển khai.

## Base

- **Base URL**: `http://localhost:6789`
- **Prefix**: `/post`
- **Auth**: Hầu hết endpoint trong `PostController` đều yêu cầu JWT:
  - Header: `Authorization: Bearer <access_token>`

> Lưu ý: Trong code hiện tại, tất cả route trong `PostController` đều gắn `@UseGuards(AuthGuard('jwt'), RolesGuard)`, tức là **phải đăng nhập**.

---

## Enum dùng trong request

- **PostType**: `NORMAL` | `POLL`
- **PostVisibility**: `PUBLIC` | `FOLLOWERS` | `PRIVATE` | `ANONYMOUS`

---

## 1) Tạo bài viết

### `POST /post`

- **Auth**: Required
- **Body**: `CreatePostDto`
  - `title?`: string
  - `content?`: string (legacy/plain text)
  - `contentJson?`: object (ProseMirror/Tiptap JSON)
  - `contentText?`: string (plain text rút gọn để preview/search)
  - `type?`: `PostType` (mặc định `NORMAL`)
  - `visibility?`: `PostVisibility` (mặc định `PUBLIC`)
  - `isDraft?`: boolean (mặc định `false`)
  - `tagIds?`: number[] (id của tag)
  - `poll?`: object (nếu muốn tạo poll kèm bài viết)
    - `options`: string[] (2..10 option)
    - `expiresAt?`: ISO date string

- **Notes**
  - Nếu gửi `contentJson` thì backend sẽ set `contentFormat = TIPTAP_JSON`.
  - Nếu chỉ gửi `content` (legacy) thì backend set `contentFormat = PLAIN_TEXT`.
  - Backend có **giới hạn size** cho `contentJson` khoảng **200KB**; nếu vượt sẽ trả **400 Bad Request**.

- **Response (200)**: đối tượng post (backend wrap bằng `new Posts(post)`), thường có các field:
  - `id`, `userId`, `title`, `content`, `contentJson`, `contentText`, `contentFormat`,
  - `type`, `visibility`, `status`, `isDraft`, `deletedAt`, `createdAt`, `updatedAt`
  - Có thể kèm `tags`, `poll` (tuỳ include/logic)

**Ví dụ body (legacy/plain text)**

```json
{
  "title": "Hello",
  "content": "Nội dung",
  "visibility": "PUBLIC",
  "isDraft": false,
  "tagIds": [1, 2],
  "poll": {
    "options": ["A", "B"],
    "expiresAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Ví dụ body (rich text JSON - Tiptap)**

```json
{
  "title": "Hello",
  "contentJson": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Xin chào từ Tiptap" }]
      }
    ]
  },
  "contentText": "Xin chào từ Tiptap",
  "visibility": "PUBLIC",
  "isDraft": false,
  "tagIds": [1, 2]
}
```

---

## 2) Cập nhật bài viết

### `PATCH /post/:id`

- **Auth**: Required
- **Params**
  - `id`: number (postId)
- **Body**: `UpdatePostDto` (partial của `CreatePostDto`)
- **Rules**
  - Chỉ **chủ bài viết** được update, nếu không sẽ bị `403 Forbidden`
  - Có lưu lịch sử sửa (`postEditHistory`)
  - Có thể update `tagIds` (backend sẽ replace toàn bộ tags theo danh sách mới)
  - Nếu gửi `contentJson` thì backend sẽ validate size (~200KB) và set `contentFormat` phù hợp

- **Response (200)**: `Posts`

---

## 3) Lấy danh sách bài viết (feed)

### `GET /post`

- **Auth**: Required
- **Response (200)**: `Post[]` (đã include quan hệ)
  - Chỉ lấy post `status = VISIBLE` và `isDraft = false`
  - Có include:
    - `user`: `{ id, fullName, avatarUrl }`
    - `likes`: array
    - `comments`: array
    - `tags`: array (kèm `tag`)
    - `poll`: có `options`
  - Nếu post có poll: backend **gắn thêm** `poll.result` bằng kết quả thống kê (từ `PollService.getResult`)

---

## 4) Lấy chi tiết 1 bài viết

### `GET /post/:id`

- **Auth**: Required
- **Params**
  - `id`: number
- **Behavior**
  - Nếu post không tồn tại / không visible / là draft → `404`
  - Có log view (tạo `postView`)
  - Nếu có poll → trả thêm `poll.result`

- **Response (200)**: object post + poll (nếu có)
  - Post object hiện trả cả `contentJson`, `contentText`, `contentFormat` (nếu đã migrate DB)

---

## 5) Xoá bài viết (hard delete)

### `DELETE /post/:id`

- **Auth**: Required
- **Params**
  - `id`: number
- **Rules**
  - Chỉ xoá được nếu `userId` là chủ bài viết (service dùng `deleteMany({ id, userId })`)
- **Response (200)**

```json
{ "message": "Post deleted successfully" }
```

---

## 6) Soft delete / Restore

### `PATCH /post/:id/soft-delete`

- **Auth**: Required
- **Response (200)**: `Posts` (set `status=DELETED`, `deletedAt=now`)

### `PATCH /post/:id/restore`

- **Auth**: Required
- **Response (200)**: `Posts` (set `status=VISIBLE`, `deletedAt=null`)

### `GET /post/deleted/me`

- **Auth**: Required
- **Response (200)**: danh sách post đã soft-delete của chính user

---

## 7) Drafts

### `GET /post/drafts/me`

- **Auth**: Required
- **Response (200)**: danh sách post draft của chính user (`isDraft=true`, `status=VISIBLE`)

### `PATCH /post/:id/publish`

- **Auth**: Required
- **Body**
  - `isDraft`: boolean
- **Rules**
  - Chỉ chủ bài viết được update
- **Response (200)**: `Posts`

**Ví dụ body**

```json
{ "isDraft": false }
```

---

## 8) Visibility

### `PATCH /post/:id/visibility`

- **Auth**: Required
- **Body**
  - `visibility`: `PostVisibility`
- **Rules**
  - Chỉ chủ bài viết được update
- **Response (200)**: `Posts`

**Ví dụ body**

```json
{ "visibility": "FOLLOWERS" }
```

---

## 9) Like / Unlike / Danh sách người like

### `POST /post/:id/like`

- **Auth**: Required
- **Response (200)**: bản ghi `PostLike` (prisma create)

### `POST /post/:id/unlike`

- **Auth**: Required
- **Response (200)**: bản ghi đã xoá (prisma delete)

### `GET /post/:id/likes`

- **Auth**: Required
- **Response (200)**: danh sách like + user
  - Service trả `include: { user: true }` (tức là trả toàn bộ field user theo schema prisma)

---

## 10) Trending

### `GET /post/trending`

- **Auth**: Required
- **Query (optional)**
  - Hiện tại controller không nhận query, service default `limit=10`
- **Response (200)**: danh sách post kèm `_count`:
  - `_count.likes`, `_count.comments`, `_count.views`

---

## 11) Comment trên Post

### `POST /post/:id/comment`

- **Auth**: Required
- **Params**
  - `id`: number (postId)
- **Body**
  - `content`: string
  - `parentId?`: number (để reply comment)
- **Rules**
  - Nếu post không visible/draft → `404`
  - Nếu `parentId` không thuộc post → `404 Parent comment not found`
- **Response (200)**: bản ghi comment (prisma create)

**Ví dụ body**

```json
{ "content": "Hay quá!", "parentId": 123 }
```

### `GET /post/:id/comments`

- **Auth**: Required
- **Response (200)**: danh sách comment cấp 1 (`parentId=null`) kèm replies
  - Có include:
    - `user`: `{ id, fullName, avatarUrl }`
    - `replies`: array (kèm `user` tương tự)

---

## 12) Poll gắn với Post

### `POST /post/:id/poll`

- **Auth**: Required
- **Params**
  - `id`: number (postId)
- **Body**: `CreatePollDto`
  - `options`: string[] (2..10)
  - `expiresAt?`: ISO date string
- **Rules**
  - Chỉ **chủ post** mới tạo poll
  - 1 post chỉ có 1 poll, nếu đã có → `409 Conflict`
- **Response (200)**: poll + options

---

## 13) Bookmark

### `POST /post/:id/bookmark`

- **Auth**: Required
- **Body**
  - `collectionId?`: number
- **Rules**
  - Nếu đã bookmark rồi → hiện tại service catch và trả `403 Forbidden` với message `You have already bookmarked this post`
- **Response (200)**: bản ghi bookmark

### `DELETE /post/:id/bookmark`

- **Auth**: Required
- **Response (200)**

```json
{ "message": "Bookmark removed successfully" }
```

---

## Status codes & lỗi hay gặp (tham khảo)

- **401 Unauthorized**: thiếu/invalid JWT (AuthGuard)
- **403 Forbidden**: không phải chủ bài viết / poll hết hạn / đã bookmark / rule khác
- **404 Not Found**: post không tồn tại hoặc không visible/draft (tuỳ endpoint)
- **409 Conflict**: post đã có poll
- **400 Bad Request**: body invalid (nếu bật global ValidationPipe) hoặc poll invalid (PollService)

---

## (Bonus) Poll endpoints (module `poll`)

Nếu frontend cần vote & xem kết quả poll trực tiếp:

- `POST /poll/:id/vote` (Auth required)
  - Body: `{ "optionId": number }`
- `GET /poll/:id/result` (Public)


