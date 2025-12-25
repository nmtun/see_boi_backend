#!/bin/bash

# Script chạy dự án cho macOS/Linux (sau khi đã setup)

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Khởi động dự án...${NC}\n"

# Kiểm tra xem đã ở đúng thư mục chưa
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy package.json. Vui lòng chạy script trong thư mục gốc của dự án.${NC}"
    exit 1
fi

# Kiểm tra file .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy file .env. Vui lòng chạy ./setup.sh trước.${NC}"
    exit 1
fi

# Kiểm tra Docker container
echo -e "${YELLOW}🐳 Kiểm tra PostgreSQL container...${NC}"
if ! docker ps | grep -q my-postgresae; then
    echo -e "${YELLOW}   Container chưa chạy, đang khởi động...${NC}"
    docker-compose up -d
    sleep 3
fi
echo -e "${GREEN}   ✓ PostgreSQL container đang chạy${NC}"

# Chạy Python Service (nếu có)
if [ -d "python_services" ] && [ -d "python_services/venv" ]; then
    echo -e "\n${YELLOW}🐍 Đang khởi động Python Service...${NC}"
    cd python_services
    source venv/bin/activate
    uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ../python_service.log 2>&1 &
    PYTHON_PID=$!
    echo $PYTHON_PID > ../python_service.pid
    cd ..
    echo -e "${GREEN}   ✓ Python Service đang chạy (PID: $PYTHON_PID, Port: 6677)${NC}"
    echo -e "${YELLOW}   Logs: python_service.log${NC}"
    sleep 2
else
    echo -e "\n${YELLOW}⚠️  Python Service không được setup. Bỏ qua...${NC}"
fi

# Chạy NestJS project
echo -e "\n${GREEN}🎯 Đang khởi động NestJS server...${NC}\n"

# Cleanup function để dừng Python service khi exit
cleanup() {
    if [ -f "python_service.pid" ]; then
        PYTHON_PID=$(cat python_service.pid)
        if ps -p $PYTHON_PID > /dev/null 2>&1; then
            echo -e "\n${YELLOW}🛑 Đang dừng Python Service (PID: $PYTHON_PID)...${NC}"
            kill $PYTHON_PID 2>/dev/null
            rm python_service.pid
        fi
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

npm run start:dev

