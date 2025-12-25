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

# Chạy NestJS project
echo -e "\n${GREEN}🎯 Đang khởi động NestJS server...${NC}\n"
npm run start:dev

