# Hướng Dẫn Triển Khai Frontend Module Nhân Tướng

## Tổng Quan

Module Nhân Tướng cung cấp 5 API endpoints để phân tích khuôn mặt và luận giải nhân tướng học:
1. **Preview** - Phân tích khuôn mặt (xem trước, không lưu)
2. **Interpret** - Lấy giải thích AI chi tiết
3. **Save** - Lưu kết quả phân tích vào database
4. **History** - Lấy danh sách lịch sử phân tích
5. **Detail** - Lấy chi tiết một lần phân tích

Tất cả API đều yêu cầu **authentication** (JWT Bearer Token).

---

## Cấu Hình Cơ Bản

### Base URL
```
http://localhost:6789/physiognomy
```

### Headers Bắt Buộc
```javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>'
}
```

**Lưu ý**: API `preview` sử dụng `multipart/form-data`, không cần `Content-Type: application/json`.

---

## API 1: Preview (Phân Tích Khuôn Mặt)

### Endpoint
```
POST /physiognomy/preview
```

### Mô Tả
Upload ảnh khuôn mặt để phân tích các đặc điểm nhân tướng học. Kết quả chỉ được trả về, **không lưu vào database**.

**Yêu cầu ảnh:**
- Định dạng: JPG, JPEG, PNG, WEBP
- Kích thước tối đa: 5MB

### Request
**Content-Type**: `multipart/form-data`

```typescript
FormData {
  image: File  // File ảnh khuôn mặt
}
```

### Response Success (200)
```typescript
{
  success: true,
  data: {
    report: {
      tam_dinh: [
        { trait: string; tags: string[] }
      ],
      long_may: [
        { trait: string; tags: string[] }
      ],
      mat: [
        { trait: string; tags: string[] }
      ],
      mui: [
        { trait: string; tags: string[] }
      ],
      tai: [
        { trait: string; tags: string[] }
      ],
      mieng_cam: [
        { trait: string; tags: string[] }
      ],
      an_duong?: [
        { trait: string; tags: string[] }
      ]
    },
    landmarks: object,  // Tọa độ các điểm trên khuôn mặt
    image_base64: string  // Ảnh đã được xử lý (base64)
  }
}
```

### Ví Dụ Code
```typescript
async function previewFaceAnalysis(token: string, imageFile: File) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('http://localhost:6789/physiognomy/preview', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Sử dụng
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await previewFaceAnalysis(token, file);
console.log(result.data.report); // Kết quả phân tích
```

### Error Responses
- **400**: File ảnh không hợp lệ, thiếu file, hoặc định dạng không được hỗ trợ
- **401**: Chưa đăng nhập hoặc token không hợp lệ
- **500**: Lỗi server khi xử lý ảnh hoặc gọi Python service

---

## API 2: Interpret (Giải Thích AI)

### Endpoint
```
POST /physiognomy/interpret
```

### Mô Tả
Gửi dữ liệu phân tích khuôn mặt (từ preview) cùng với thông tin cá nhân (tên, ngày sinh, giới tính) để nhận giải thích chi tiết bằng AI. Kết quả **không được lưu vào database**.

### Request Body
```typescript
{
  data: {
    name?: string;           // Tên (tùy chọn, nhưng nên cung cấp)
    birthday?: string;        // Ngày sinh YYYY-MM-DD (tùy chọn)
    gender?: "MALE" | "FEMALE"; // Giới tính (tùy chọn)
    report: object;           // Kết quả từ API preview
    landmarks?: object;       // Landmarks từ API preview
    image_base64?: string;    // Ảnh base64 từ API preview
  }
}
```

### Response Success (200)
```typescript
{
  success: true,
  data: {
    interpret: {
      "tong-quan": string;  // Luận giải tổng quan mệnh cục
      tam_dinh: {
        thuong_dinh: string;  // Giải thích về thượng đình
        trung_dinh: string;   // Giải thích về trung đình
        ha_dinh: string;      // Giải thích về hạ đình
        tong_quan: string;    // Tổng quan về tam đình
      },
      ngu_quan: {
        long_may: string;     // Giải thích về lông mày
        mat: string;          // Giải thích về mắt
        mui: string;          // Giải thích về mũi
        tai: string;          // Giải thích về tai
        mieng_cam: string;    // Giải thích về miệng và hàm
      },
      an_duong?: {
        mo_ta: string;        // Mô tả ấn đường
        y_nghia: string;      // Ý nghĩa
        danh_gia: string;     // Đánh giá
      },
      loi_khuyen: string[]    // Mảng các lời khuyên
    }
  }
}
```

### Ví Dụ Code
```typescript
async function getInterpretation(
  token: string, 
  previewData: any,  // Dữ liệu từ API preview
  personalInfo: {
    name?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE";
  }
) {
  const response = await fetch('http://localhost:6789/physiognomy/interpret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      data: {
        ...personalInfo,
        report: previewData.report,
        landmarks: previewData.landmarks,
        image_base64: previewData.image_base64
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Sử dụng
const previewResult = await previewFaceAnalysis(token, imageFile);
const interpretResult = await getInterpretation(token, previewResult.data, {
  name: 'Nguyễn Văn A',
  birthday: '2002-08-15',
  gender: 'MALE'
});

console.log(interpretResult.data.interpret['tong-quan']); // Luận giải tổng quan
```

### Error Responses
- **400**: Thiếu dữ liệu phân tích (report data)
- **401**: Chưa đăng nhập hoặc token không hợp lệ
- **500**: Lỗi server khi gọi AI service

---

## API 3: Save (Lưu Kết Quả)

### Endpoint
```
POST /physiognomy/save
```

### Mô Tả
Lưu toàn bộ dữ liệu phân tích khuôn mặt (bao gồm report, interpret nếu có, landmarks, và ảnh) vào database.

### Request Body
```typescript
{
  data: {
    name?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE";
    report: object;           // Từ API preview
    interpret?: object;        // Từ API interpret (tùy chọn)
    landmarks?: object;        // Từ API preview
    image_base64: string;      // Từ API preview
  }
}
```

### Response Success (200)
```typescript
{
  success: true,
  data: {
    saved_id: number  // ID của bản ghi đã lưu
  }
}
```

### Ví Dụ Code
```typescript
async function saveAnalysis(
  token: string,
  previewData: any,
  interpretData?: any,
  personalInfo?: {
    name?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE";
  }
) {
  const response = await fetch('http://localhost:6789/physiognomy/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      data: {
        ...personalInfo,
        report: previewData.report,
        interpret: interpretData?.interpret,
        landmarks: previewData.landmarks,
        image_base64: previewData.image_base64
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
```

### Error Responses
- **400**: Thiếu dữ liệu phân tích (analysis data)
- **401**: Chưa đăng nhập hoặc token không hợp lệ
- **500**: Lỗi server khi lưu vào database

---

## API 4: History (Lịch Sử Phân Tích)

### Endpoint
```
GET /physiognomy/history
```

### Mô Tả
Lấy danh sách tất cả các lần phân tích khuôn mặt đã lưu của người dùng hiện tại. Danh sách được sắp xếp theo thời gian mới nhất trước.

### Response Success (200)
```typescript
[
  {
    id: number;
    userId: number;
    name: string;
    dob: Date;
    gender: string;
    report: object;
    metrics: object;        // interpret data
    landmarks: object;
    tags: string[];
    image_base64: string;
    createdAt: string;
    updatedAt: string;
  },
  // ... các bản ghi khác
]
```

### Ví Dụ Code
```typescript
async function getHistory(token: string) {
  const response = await fetch('http://localhost:6789/physiognomy/history', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Sử dụng
const history = await getHistory(token);
console.log(history); // Mảng các lần phân tích đã lưu
```

### Error Responses
- **401**: Chưa đăng nhập hoặc token không hợp lệ

---

## API 5: Detail (Chi Tiết Phân Tích)

### Endpoint
```
GET /physiognomy/history/:id
```

### Mô Tả
Lấy thông tin chi tiết đầy đủ của một lần phân tích khuôn mặt đã lưu theo ID. Chỉ có thể xem các phân tích của chính người dùng.

### Response Success (200)
```typescript
{
  id: number;
  userId: number;
  name: string;
  dob: Date;
  gender: string;
  report: {
    tam_dinh: Array<{ trait: string; tags: string[] }>;
    long_may: Array<{ trait: string; tags: string[] }>;
    mat: Array<{ trait: string; tags: string[] }>;
    mui: Array<{ trait: string; tags: string[] }>;
    tai: Array<{ trait: string; tags: string[] }>;
    mieng_cam: Array<{ trait: string; tags: string[] }>;
    an_duong?: Array<{ trait: string; tags: string[] }>;
  };
  metrics: {
    "tong-quan": string;
    tam_dinh: object;
    ngu_quan: object;
    an_duong?: object;
    loi_khuyen: string[];
  };
  landmarks: object;
  tags: string[];
  image_base64: string;
  createdAt: string;
  updatedAt: string;
}
```

### Ví Dụ Code
```typescript
async function getDetail(token: string, id: number) {
  const response = await fetch(`http://localhost:6789/physiognomy/history/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Sử dụng
const detail = await getDetail(token, 1);
console.log(detail.report); // Chi tiết phân tích
```

### Error Responses
- **401**: Chưa đăng nhập hoặc token không hợp lệ
- **403**: Không có quyền xem phân tích này (không phải của người dùng hiện tại)
- **404**: Không tìm thấy lần phân tích với ID này

---

## Flow Sử Dụng Đề Xuất

### Flow 1: Phân Tích và Lưu Ngay (Không có giải thích AI)
```typescript
// 1. Upload ảnh và phân tích
const previewResult = await previewFaceAnalysis(token, imageFile);

// 2. Lưu kết quả (có thể thêm thông tin cá nhân)
const saveResult = await saveAnalysis(token, previewResult.data, null, {
  name: 'Nguyễn Văn A',
  birthday: '2002-08-15',
  gender: 'MALE'
});

console.log('Đã lưu với ID:', saveResult.data.saved_id);
```

### Flow 2: Phân Tích, Lấy Giải Thích AI, Rồi Lưu
```typescript
// 1. Upload ảnh và phân tích
const previewResult = await previewFaceAnalysis(token, imageFile);

// 2. Lấy giải thích AI (có thể thêm thông tin cá nhân để luận giải chính xác hơn)
const interpretResult = await getInterpretation(token, previewResult.data, {
  name: 'Nguyễn Văn A',
  birthday: '2002-08-15',
  gender: 'MALE'
});

// 3. Lưu cả report và interpret
const saveResult = await saveAnalysis(
  token, 
  previewResult.data, 
  interpretResult.data,
  {
    name: 'Nguyễn Văn A',
    birthday: '2002-08-15',
    gender: 'MALE'
  }
);

console.log('Đã lưu với ID:', saveResult.data.saved_id);
```

### Flow 3: Xem Lịch Sử và Chi Tiết
```typescript
// 1. Lấy danh sách lịch sử
const history = await getHistory(token);

// 2. Xem chi tiết một lần phân tích
if (history.length > 0) {
  const detail = await getDetail(token, history[0].id);
  console.log('Chi tiết:', detail);
}
```

---

## Service Class Mẫu

```typescript
class PhysiognomyService {
  private baseURL = 'http://localhost:6789/physiognomy';
  
  constructor(private token: string) {}

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}/${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async preview(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.request('preview', {
      method: 'POST',
      body: formData
    });
  }

  async interpret(data: {
    name?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE";
    report: any;
    landmarks?: any;
    image_base64?: string;
  }) {
    return this.request('interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
  }

  async save(data: {
    name?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE";
    report: any;
    interpret?: any;
    landmarks?: any;
    image_base64: string;
  }) {
    return this.request('save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
  }

  async getHistory() {
    return this.request('history');
  }

  async getDetail(id: number) {
    return this.request(`history/${id}`);
  }
}
```

---

## Lưu Ý Quan Trọng

1. **File Upload**: API `preview` sử dụng `multipart/form-data`, không gửi `Content-Type` header (browser sẽ tự set).

2. **Thông Tin Cá Nhân**: Mặc dù `name`, `birthday`, `gender` là tùy chọn trong API `interpret`, nhưng nên cung cấp để có luận giải tổng quan mệnh cục chính xác hơn.

3. **Dữ Liệu Liên Kết**: 
   - Dữ liệu từ `preview` cần được truyền vào `interpret` và `save`
   - `interpret` có thể được truyền vào `save` để lưu kèm giải thích AI

4. **Error Handling**: Luôn xử lý các trường hợp lỗi (400, 401, 403, 404, 500) và hiển thị thông báo phù hợp.

5. **Loading States**: Hiển thị loading indicator vì quá trình phân tích có thể mất thời gian (đặc biệt là gọi Python service).

6. **Image Display**: `image_base64` từ response có thể hiển thị trực tiếp:
   ```typescript
   <img src={result.data.image_base64} alt="Analyzed face" />
   ```

7. **Validation**: Validate file ảnh trước khi upload:
   - Kiểm tra định dạng (jpg, jpeg, png, webp)
   - Kiểm tra kích thước (tối đa 5MB)

---

## Ví Dụ React Component

```typescript
import React, { useState } from 'react';

function PhysiognomyAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [interpretData, setInterpretData] = useState<any>(null);
  const token = localStorage.getItem('token');
  const service = new PhysiognomyService(token);

  const handlePreview = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const result = await service.preview(file);
      setPreviewData(result.data);
    } catch (error) {
      console.error('Lỗi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInterpret = async () => {
    if (!previewData) return;
    
    setLoading(true);
    try {
      const result = await service.interpret({
        name: 'Nguyễn Văn A',
        birthday: '2002-08-15',
        gender: 'MALE',
        ...previewData
      });
      setInterpretData(result.data);
    } catch (error) {
      console.error('Lỗi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!previewData) return;
    
    setLoading(true);
    try {
      const result = await service.save({
        name: 'Nguyễn Văn A',
        birthday: '2002-08-15',
        gender: 'MALE',
        ...previewData,
        interpret: interpretData?.interpret
      });
      alert(`Đã lưu với ID: ${result.data.saved_id}`);
    } catch (error) {
      console.error('Lỗi:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={(e) => setFile(e.target.files?.[0] || null)} 
      />
      <button onClick={handlePreview} disabled={loading || !file}>
        Phân Tích
      </button>
      
      {previewData && (
        <>
          <img src={previewData.image_base64} alt="Analyzed" />
          <button onClick={handleInterpret} disabled={loading}>
            Lấy Giải Thích AI
          </button>
          <button onClick={handleSave} disabled={loading}>
            Lưu Kết Quả
          </button>
        </>
      )}
      
      {interpretData && (
        <div>
          <h3>Tổng Quan</h3>
          <p>{interpretData.interpret['tong-quan']}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Kết Luận

Module Nhân Tướng cung cấp đầy đủ các API để phân tích khuôn mặt và luận giải nhân tướng học. Flow sử dụng linh hoạt: có thể chỉ phân tích và lưu, hoặc phân tích → lấy giải thích AI → lưu. Đảm bảo tuân thủ các best practices về authentication, error handling, và user experience.

