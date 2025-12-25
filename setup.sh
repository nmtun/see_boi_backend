#!/bin/bash

# Script setup dự án cho macOS/Linux
# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Bắt đầu setup dự án...${NC}\n"

# Kiểm tra xem đã ở đúng thư mục chưa
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy package.json. Vui lòng chạy script trong thư mục gốc của dự án.${NC}"
    exit 1
fi

# Bước 1: Kiểm tra và tạo file .env từ .env.example
echo -e "${YELLOW}📝 Bước 1: Kiểm tra và tạo file .env...${NC}"
if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy file .env.example${NC}"
    exit 1
fi

if [ -f ".env" ]; then
    echo -e "${YELLOW}   Xóa file .env cũ...${NC}"
    rm .env
fi

echo -e "${YELLOW}   Tạo file .env mới từ .env.example...${NC}"
cp .env.example .env
echo -e "${GREEN}   ✓ Đã tạo file .env từ .env.example${NC}"

# Bước 2: Cài đặt dependencies
echo -e "\n${YELLOW}📦 Bước 2: Cài đặt dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Lỗi khi cài đặt dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}   ✓ Đã cài đặt dependencies${NC}"
else
    echo -e "${GREEN}   ✓ Dependencies đã được cài đặt${NC}"
fi

# Bước 3: Kiểm tra Docker
echo -e "\n${YELLOW}🐳 Bước 3: Kiểm tra Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker chưa được cài đặt. Vui lòng cài đặt Docker trước.${NC}"
    exit 1
fi
echo -e "${GREEN}   ✓ Docker đã được cài đặt${NC}"

# Bước 4: Khởi động PostgreSQL container
echo -e "\n${YELLOW}🗄️  Bước 4: Khởi động PostgreSQL container...${NC}"
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lỗi khi khởi động Docker container${NC}"
    exit 1
fi

# Đợi PostgreSQL sẵn sàng
echo -e "${YELLOW}   Đợi PostgreSQL khởi động...${NC}"
sleep 5

# Bước 5: Migration database
echo -e "\n${YELLOW}🔄 Bước 5: Chạy migration database...${NC}"
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lỗi khi chạy migration${NC}"
    exit 1
fi

npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lỗi khi generate Prisma Client${NC}"
    exit 1
fi
echo -e "${GREEN}   ✓ Đã chạy migration và generate Prisma Client${NC}"

# Bước 6: Setup Python Service
echo -e "\n${YELLOW}🐍 Bước 6: Setup Python Service...${NC}"
if [ -d "python_services" ]; then
    echo -e "${YELLOW}   Kiểm tra Python...${NC}"
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo -e "${YELLOW}   ⚠️  Python chưa được cài đặt. Vui lòng cài đặt Python 3.8+ trước.${NC}"
    else
        PYTHON_CMD="python3"
        if ! command -v python3 &> /dev/null; then
            PYTHON_CMD="python"
        fi
        
        echo -e "${YELLOW}   Kiểm tra pip...${NC}"
        if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
            echo -e "${YELLOW}   ⚠️  pip chưa được cài đặt. Vui lòng cài đặt pip trước.${NC}"
        else
            PIP_CMD="pip3"
            if ! command -v pip3 &> /dev/null; then
                PIP_CMD="pip"
            fi
            
            cd python_services
            
            # Tạo virtual environment
            echo -e "${YELLOW}   Tạo virtual environment...${NC}"
            if [ -d "venv" ]; then
                echo -e "${YELLOW}   Virtual environment đã tồn tại, bỏ qua...${NC}"
            else
                $PYTHON_CMD -m venv venv
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}   ✓ Đã tạo virtual environment${NC}"
                else
                    echo -e "${RED}   ❌ Lỗi khi tạo virtual environment${NC}"
                    cd ..
                    exit 1
                fi
            fi
            
            # Activate venv và cài đặt dependencies
            if [ -f "requirements.txt" ]; then
                echo -e "${YELLOW}   Cài đặt Python dependencies...${NC}"
                source venv/bin/activate
                $PIP_CMD install -r requirements.txt
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}   ✓ Đã cài đặt Python dependencies${NC}"
                else
                    echo -e "${YELLOW}   ⚠️  Có lỗi khi cài đặt Python dependencies${NC}"
                fi
                deactivate
            else
                echo -e "${YELLOW}   ⚠️  Không tìm thấy requirements.txt trong python_services${NC}"
            fi
            cd ..
        fi
    fi
else
    echo -e "${YELLOW}   ⚠️  Thư mục python_services không tồn tại${NC}"
fi

# Bước 7: Import dữ liệu seed
echo -e "\n${YELLOW}🌱 Bước 7: Import dữ liệu seed...${NC}"

# Import users qua seed script
if [ -f "seed-users.ts" ]; then
    echo -e "${YELLOW}   Import users...${NC}"
    npx ts-node seed-users.ts
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}   ⚠️  Có lỗi khi import users (có thể đã tồn tại)${NC}"
    else
        echo -e "${GREEN}   ✓ Đã import users${NC}"
    fi
fi

# Import dữ liệu từ seed.sql
if [ -f "seed.sql" ]; then
    echo -e "${YELLOW}   Import dữ liệu từ seed.sql...${NC}"
    cat seed.sql | docker exec -i my-postgresae psql -U admin -d mydb
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}   ⚠️  Có lỗi khi import seed.sql (có thể đã tồn tại)${NC}"
    else
        echo -e "${GREEN}   ✓ Đã import seed.sql${NC}"
    fi
fi

echo -e "\n${GREEN}✅ Setup hoàn tất!${NC}"
echo -e "${GREEN}📌 Để chạy dự án:${NC}"
echo -e "${GREEN}   - Tất cả services: ./run.sh${NC}"
echo -e "${GREEN}   - Chỉ NestJS: npm run start:dev${NC}"
echo -e "${GREEN}   - Chỉ Python Service: cd python_services && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 6677${NC}\n"

