# Hướng dẫn Backend: Rich Text (JSON) với NestJS + Prisma + PostgreSQL

Tài liệu này hướng dẫn triển khai backend để lưu nội dung bài viết rich text dạng **JSON (ProseMirror/Tiptap)**.

## Mục tiêu

- Cho phép FE gửi `contentJson` (object) + `contentText` (string) khi tạo/cập nhật post.
- Lưu `contentJson` vào PostgreSQL (khuyến nghị `jsonb`).
- Vẫn có `contentText` để:
  - render preview (list/feed)
  - full-text search (sau này)
  - chống payload “nặng” cho list

## 1) Thay đổi schema Prisma (khuyến nghị)

### Option A (khuyến nghị): thêm cột mới, giữ tương thích

Giả sử model `Posts` (hoặc `Post`) hiện có `content String?`:

- Thêm:
  - `contentJson Json?` (Prisma `Json` → Postgres `jsonb`)
  - `contentText String?` (text rút từ editor)
  - (optional) `contentFormat PostContentFormat` để hỗ trợ nhiều format

Ví dụ Prisma schema (minh hoạ):

```prisma
enum PostContentFormat {
  PLAIN_TEXT
  TIPTAP_JSON
}

model Posts {
  id           Int      @id @default(autoincrement())
  title        String?
  content      String?  // (legacy) nếu bạn muốn giữ

  contentJson  Json?
  contentText  String?
  contentFormat PostContentFormat? @default(TIPTAP_JSON)

  // ... các field khác (visibility/type/status/userId/createdAt/updatedAt)
}
```

Sau đó chạy migration:

```bash
npx prisma migrate dev -n add_post_content_json
```

### Option B: thay `content` thành Json

Không khuyến nghị nếu bạn đã có nhiều nơi đang assume `content` là string.

## 2) DTO (Create/Update) trong NestJS

Bạn cần update DTO để nhận `contentJson` + `contentText`.

Ví dụ (minh hoạ) `CreatePostDto`:

```ts
import { IsOptional, IsString, IsEnum, IsBoolean, ValidateNested, IsObject, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  // Legacy (nếu còn dùng):
  @IsOptional()
  @IsString()
  content?: string;

  // Rich text JSON (Tiptap)
  @IsOptional()
  @IsObject()
  contentJson?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  contentText?: string;

  // ... type/visibility/isDraft/poll/tagIds theo spec POST.md
}
```

> `class-validator` không validate sâu cấu trúc JSON. Nếu muốn chắc chắn, dùng `zod`/`ajv` để validate schema ProseMirror.

## 3) Validation/Guardrail quan trọng (khuyến nghị)

### 3.1 Giới hạn payload JSON

- Giới hạn size (ví dụ 50KB–200KB) để tránh:
  - request quá nặng
  - DB lưu blob lớn
  - FE render chậm

Cách làm:

- Trong service: `JSON.stringify(dto.contentJson).length` để kiểm tra byte-length xấp xỉ.
- Nếu vượt: throw `BadRequestException`.

### 3.2 Sanitize?

Với JSON renderer (không render HTML trực tiếp), XSS giảm rất mạnh.
Tuy nhiên vẫn nên:

- validate “shape” basic
- limit depth/size
- chặn các node không mong muốn (nếu bạn cho embed HTML/custom nodes)

## 4) Mapping lưu vào DB (Service)

Khi create/update:

- Nếu FE gửi `contentJson`:
  - lưu `contentJson` (jsonb)
  - lưu `contentText` (plain)
  - set `contentFormat = TIPTAP_JSON`
- Nếu FE chỉ gửi `content` legacy:
  - set `contentFormat = PLAIN_TEXT`

Pseudo logic:

```ts
const contentJson = dto.contentJson ?? null;
const contentText = dto.contentText ?? null;

await prisma.posts.create({
  data: {
    title: dto.title,
    // legacy:
    content: dto.content,
    contentJson,
    contentText,
    contentFormat: contentJson ? 'TIPTAP_JSON' : 'PLAIN_TEXT',
    // ...
  }
})
```

## 5) Response cho FE

### `GET /post/:id`

Trả về:

- `contentJson` (để FE render rich text)
- `contentText` (nếu FE cần preview)
- `user` (theo spec POST.md)
- `poll` (nếu có)

### `GET /post`

Tuỳ mục tiêu performance:

- Nếu feed chỉ cần preview: trả `contentText` hoặc `contentPreview` (rút gọn)
- Nếu feed muốn render rich text: trả `contentJson` (nặng hơn)

## 6) Backward compatibility & migration dữ liệu

Nếu bạn đang có dữ liệu `content` dạng string:

- Không bắt buộc migrate ngay.
- Khi FE gửi post mới bằng JSON, các post cũ vẫn có `content` và `contentJson=null`.
- Khi FE render:
  - ưu tiên `contentJson` nếu có
  - fallback hiển thị `content` plain text nếu không có

Nếu muốn migrate:

- Viết script convert plain text → ProseMirror doc:
  - `{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] }`

## 7) Checklist nhanh để implement

- [ ] Prisma schema: thêm `contentJson Json?`, `contentText String?`, (optional) `contentFormat`
- [ ] Migrate DB
- [ ] Update DTO: nhận `contentJson`, `contentText`
- [ ] Update service create/update: lưu vào DB, limit size JSON
- [ ] Update serializer/response: trả `contentJson` trong `GET /post/:id`
- [ ] (Optional) Update `GET /post`: trả preview hợp lý


