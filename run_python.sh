#!/bin/bash

# Script chạy Python service cho macOS/Linux
# Tự động setup venv, cài đặt dependencies, giải phóng port và khởi động service

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐍 Khởi động Python Service...${NC}\n"

# Kiểm tra xem đã ở đúng thư mục chưa
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy package.json. Vui lòng chạy script trong thư mục gốc của dự án.${NC}"
    exit 1
fi

# Kiểm tra thư mục python_services
if [ ! -d "python_services" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy thư mục python_services.${NC}"
    exit 1
fi

# Bước 1: Kiểm tra Python
echo -e "${YELLOW}📋 Bước 1: Kiểm tra Python...${NC}"
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python chưa được cài đặt. Vui lòng cài đặt Python 3.8+ trước.${NC}"
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}   ✓ $PYTHON_VERSION${NC}"

# Bước 2: Kiểm tra pip
echo -e "\n${YELLOW}📋 Bước 2: Kiểm tra pip...${NC}"
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo -e "${RED}❌ pip chưa được cài đặt. Vui lòng cài đặt pip trước.${NC}"
    exit 1
fi

PIP_CMD="pip3"
if ! command -v pip3 &> /dev/null; then
    PIP_CMD="pip"
fi

echo -e "${GREEN}   ✓ pip đã được cài đặt${NC}"

# Bước 3: Tạo virtual environment
echo -e "\n${YELLOW}📋 Bước 3: Tạo virtual environment...${NC}"
cd python_services

if [ -d "venv" ]; then
    echo -e "${YELLOW}   Virtual environment đã tồn tại, bỏ qua...${NC}"
else
    echo -e "${YELLOW}   Đang tạo virtual environment...${NC}"
    $PYTHON_CMD -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}   ❌ Lỗi khi tạo virtual environment${NC}"
        cd ..
        exit 1
    fi
    echo -e "${GREEN}   ✓ Đã tạo virtual environment${NC}"
fi

# Bước 4: Activate venv và cài đặt dependencies
echo -e "\n${YELLOW}📋 Bước 4: Cài đặt Python dependencies...${NC}"
source venv/bin/activate

if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ Không tìm thấy requirements.txt trong python_services${NC}"
    deactivate
    cd ..
    exit 1
fi

echo -e "${YELLOW}   Đang cài đặt dependencies từ requirements.txt...${NC}"
$PIP_CMD install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ Lỗi khi cài đặt Python dependencies${NC}"
    deactivate
    cd ..
    exit 1
fi
echo -e "${GREEN}   ✓ Đã cài đặt Python dependencies${NC}"

# Bước 5: Kiểm tra file model
echo -e "\n${YELLOW}📋 Bước 5: Kiểm tra file model...${NC}"
if [ ! -f "face_landmarker.task" ]; then
    echo -e "${YELLOW}   ⚠️  Không tìm thấy face_landmarker.task trong python_services/${NC}"
    if [ -f "../face_landmarker.task" ]; then
        echo -e "${YELLOW}   Đang copy file model từ thư mục gốc...${NC}"
        cp ../face_landmarker.task face_landmarker.task
        echo -e "${GREEN}   ✓ Đã copy file model${NC}"
    else
        echo -e "${RED}   ❌ Không tìm thấy file model. Vui lòng đảm bảo file face_landmarker.task có trong python_services/ hoặc thư mục gốc.${NC}"
        deactivate
        cd ..
        exit 1
    fi
else
    echo -e "${GREEN}   ✓ File model đã tồn tại${NC}"
fi

# Bước 6: Giải phóng port 6677
echo -e "\n${YELLOW}📋 Bước 6: Kiểm tra và giải phóng port 6677...${NC}"
PORT_PIDS=$(lsof -ti :6677 2>/dev/null)
if [ -n "$PORT_PIDS" ]; then
    echo -e "${YELLOW}   Đang dừng process cũ đang sử dụng port 6677...${NC}"
    for PID in $PORT_PIDS; do
        echo -e "${YELLOW}   Dừng process PID: $PID${NC}"
        kill -9 $PID 2>/dev/null
    done
    sleep 2
    
    # Kiểm tra lại
    REMAINING_PIDS=$(lsof -ti :6677 2>/dev/null)
    if [ -n "$REMAINING_PIDS" ]; then
        echo -e "${RED}   ❌ Không thể dừng tất cả process. Vui lòng kiểm tra thủ công.${NC}"
        deactivate
        cd ..
        exit 1
    fi
    echo -e "${GREEN}   ✓ Port 6677 đã được giải phóng${NC}"
else
    echo -e "${GREEN}   ✓ Port 6677 đã trống${NC}"
fi

# Bước 7: Khởi động Python service
echo -e "\n${YELLOW}📋 Bước 7: Khởi động Python service...${NC}"
echo -e "${YELLOW}   Đang khởi động uvicorn trên port 6677...${NC}"

# Khởi động trong background với nohup để process chạy độc lập
nohup uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ../python_service.log 2>&1 &
PYTHON_PID=$!
disown $PYTHON_PID 2>/dev/null || true  # Tách process khỏi shell (nếu shell hỗ trợ)
echo $PYTHON_PID > ../python_service.pid

# Đợi service khởi động
sleep 3

# Kiểm tra service có chạy không
if ps -p $PYTHON_PID > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Python Service đã khởi động (PID: $PYTHON_PID)${NC}"
    
    # Test service có phản hồi không
    if curl -s http://127.0.0.1:6677/docs > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Python Service đang chạy thành công trên port 6677${NC}"
        echo -e "${GREEN}   📝 Logs: python_service.log${NC}"
        echo -e "${GREEN}   🔗 Swagger: http://127.0.0.1:6677/docs${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Service đã khởi động nhưng chưa phản hồi. Kiểm tra log:${NC}"
        tail -20 ../python_service.log
    fi
else
    echo -e "${RED}   ❌ Python Service không khởi động được. Kiểm tra log:${NC}"
    tail -30 ../python_service.log
    deactivate
    cd ..
    exit 1
fi

cd ..

echo -e "\n${GREEN}✅ Python Service đã sẵn sàng!${NC}"
echo -e "${GREEN}   Process đang chạy độc lập (PID: $PYTHON_PID)${NC}"
echo -e "${GREEN}   Service sẽ tiếp tục chạy ngay cả khi bạn đóng terminal${NC}"
echo -e "${YELLOW}💡 Để dừng service: kill \$(cat python_service.pid)${NC}\n"

