# Python Service - Các lệnh sửa lỗi

Tài liệu này tổng hợp các lệnh đã sử dụng để khắc phục các lỗi liên quan đến Python service cho chức năng Physiognomy.

---

## 1. Kiểm tra Python service đang chạy

### Kiểm tra process đang chạy
```bash
ps aux | grep -E "uvicorn|python.*main.py" | grep -v grep
```

### Kiểm tra port đang được sử dụng
```bash
lsof -i :6677
# Hoặc
lsof -ti :6677
```

### Kiểm tra port có đang listen không
```bash
lsof -i :6677 | grep LISTEN
# Hoặc
netstat -an | grep 6677
```

---

## 2. Lỗi: FileNotFoundError - Không tìm thấy face_landmarker.task

### Tìm file model
```bash
find . -name "face_landmarker.task" -type f
```

### Kiểm tra file có tồn tại không
```bash
ls -la face_landmarker.task
ls -la python_services/face_landmarker.task
```

### Copy file model vào đúng vị trí
```bash
# Nếu file ở thư mục gốc, copy vào python_services/
cp face_landmarker.task python_services/face_landmarker.task
```

### Kiểm tra file đã được copy
```bash
ls -lh python_services/face_landmarker.task
```

---

## 3. Lỗi: Address already in use (Port 6677 đã được sử dụng)

### Tìm process đang sử dụng port
```bash
lsof -ti :6677
```

### Dừng process cũ (nhẹ nhàng)
```bash
PID=$(lsof -ti :6677)
kill $PID
```

### Force kill nếu cần
```bash
PID=$(lsof -ti :6677)
kill -9 $PID
```

### Dừng nhiều process cùng lúc
```bash
kill -9 6179 28935 2>/dev/null
```

### Kiểm tra port đã trống chưa
```bash
lsof -ti :6677 && echo "Vẫn còn process" || echo "Port đã trống"
```

---

## 4. Lỗi: Missing python-multipart

### Cài đặt package thiếu
```bash
cd python_services
source venv/bin/activate
pip install python-multipart
```

### Cập nhật requirements.txt
```bash
# Thêm dòng sau vào requirements.txt:
python-multipart
```

---

## 5. Lỗi: Python service không phản hồi (Timeout)

### Test Python service trực tiếp
```bash
# Test với curl (timeout 10 giây)
curl -X POST http://127.0.0.1:6677/analyze-face -F "file=@/dev/null" --max-time 10

# Test Swagger docs
curl -s http://127.0.0.1:6677/docs | head -5
```

### Kiểm tra log của Python service
```bash
tail -50 python_service.log
# Hoặc
tail -f python_service.log  # Theo dõi real-time
```

---

## 6. Khởi động Python service

### Khởi động thủ công
```bash
cd python_services
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 6677
```

### Khởi động trong background với log
```bash
cd python_services
source venv/bin/activate
nohup uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ../python_service.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > ../python_service.pid
echo "Python service PID: $NEW_PID"
```

### Khởi động và kiểm tra
```bash
cd python_services
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ../python_service.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > ../python_service.pid
sleep 5
if curl -s http://127.0.0.1:6677/docs > /dev/null 2>&1; then
  echo "✅ Python service đang chạy thành công"
else
  echo "⚠️  Kiểm tra log:"
  tail -20 ../python_service.log
fi
```

---

## 7. Dừng Python service

### Dừng bằng PID file
```bash
kill $(cat python_service.pid)
```

### Dừng tất cả uvicorn processes
```bash
pkill -f "uvicorn main:app"
```

### Force kill
```bash
PID=$(cat python_service.pid)
kill -9 $PID
rm python_service.pid
```

---

## 8. Kiểm tra cấu hình và dependencies

### Kiểm tra Python version
```bash
python3 --version
# Hoặc
python --version
```

### Kiểm tra pip
```bash
pip3 --version
# Hoặc
pip --version
```

### Kiểm tra virtual environment
```bash
cd python_services
ls -la venv/
```

### Kiểm tra dependencies đã cài đặt
```bash
cd python_services
source venv/bin/activate
pip list | grep -E "fastapi|uvicorn|python-multipart|opencv|numpy|mediapipe"
```

### Cài đặt lại dependencies
```bash
cd python_services
source venv/bin/activate
pip install -r requirements.txt
```

---

## 9. Debug Python service

### Xem log real-time
```bash
tail -f python_service.log
```

### Test endpoint trực tiếp
```bash
# Test với ảnh thật
curl -X POST http://127.0.0.1:6677/analyze-face \
  -F "file=@/path/to/image.jpg" \
  --max-time 60

# Test Swagger UI
open http://127.0.0.1:6677/docs
```

### Kiểm tra environment variables
```bash
cd python_services
source venv/bin/activate
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('AI_SERVER_HOST:', os.getenv('AI_SERVER_HOST', '127.0.0.1')); print('AI_SERVER_PORT:', os.getenv('AI_SERVER_PORT', '6677'))"
```

---

## 10. Quy trình khắc phục lỗi đầy đủ

### Bước 1: Dừng service cũ
```bash
# Tìm và dừng process cũ
PID=$(lsof -ti :6677)
if [ -n "$PID" ]; then
  kill -9 $PID
  sleep 2
fi
```

### Bước 2: Kiểm tra file model
```bash
# Đảm bảo file model có trong python_services/
if [ ! -f "python_services/face_landmarker.task" ]; then
  if [ -f "face_landmarker.task" ]; then
    cp face_landmarker.task python_services/
    echo "✅ Đã copy file model"
  else
    echo "❌ Không tìm thấy file model"
    exit 1
  fi
fi
```

### Bước 3: Kiểm tra dependencies
```bash
cd python_services
source venv/bin/activate
pip install -r requirements.txt
```

### Bước 4: Khởi động lại service
```bash
cd python_services
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ../python_service.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > ../python_service.pid
echo "✅ Python service đã khởi động với PID: $NEW_PID"
```

### Bước 5: Kiểm tra service hoạt động
```bash
sleep 5
if curl -s http://127.0.0.1:6677/docs > /dev/null 2>&1; then
  echo "✅ Python service đang chạy thành công"
else
  echo "❌ Python service không phản hồi, kiểm tra log:"
  tail -30 python_service.log
fi
```

---

## 11. Các lỗi thường gặp và cách xử lý

### Lỗi: `FileNotFoundError: Unable to open file at face_landmarker.task`
**Nguyên nhân:** File model không có trong thư mục `python_services/`

**Giải pháp:**
```bash
# Copy file vào đúng vị trí
cp face_landmarker.task python_services/face_landmarker.task
```

### Lỗi: `Address already in use`
**Nguyên nhân:** Port 6677 đang được sử dụng bởi process khác

**Giải pháp:**
```bash
# Tìm và dừng process
lsof -ti :6677 | xargs kill -9
```

### Lỗi: `RuntimeError: Form data requires "python-multipart"`
**Nguyên nhân:** Thiếu package `python-multipart`

**Giải pháp:**
```bash
cd python_services
source venv/bin/activate
pip install python-multipart
```

### Lỗi: Timeout khi gọi API
**Nguyên nhân:** Python service không phản hồi hoặc xử lý quá lâu

**Giải pháp:**
1. Kiểm tra log: `tail -f python_service.log`
2. Kiểm tra service có đang chạy: `lsof -i :6677`
3. Khởi động lại service nếu cần

---

## 12. Script tự động khởi động

Tạo file `start_python_service.sh`:
```bash
#!/bin/bash

# Dừng service cũ
PID=$(lsof -ti :6677)
if [ -n "$PID" ]; then
  echo "Dừng service cũ (PID: $PID)..."
  kill -9 $PID
  sleep 2
fi

# Kiểm tra file model
if [ ! -f "python_services/face_landmarker.task" ]; then
  if [ -f "face_landmarker.task" ]; then
    cp face_landmarker.task python_services/
  else
    echo "❌ Không tìm thấy file model"
    exit 1
  fi
fi

# Khởi động service
cd python_services
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ../python_service.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > ../python_service.pid
cd ..

echo "✅ Python service đã khởi động với PID: $NEW_PID"
echo "📝 Log: python_service.log"
echo "🔗 Swagger: http://127.0.0.1:6677/docs"
```

Sử dụng:
```bash
chmod +x start_python_service.sh
./start_python_service.sh
```

---

## Lưu ý

- Luôn kiểm tra log khi gặp lỗi: `tail -f python_service.log`
- Đảm bảo file model `face_landmarker.task` có trong `python_services/`
- Kiểm tra port 6677 có trống trước khi khởi động service
- Sử dụng `--reload` khi development để tự động reload khi code thay đổi
- Log được lưu trong `python_service.log` ở thư mục gốc của project

