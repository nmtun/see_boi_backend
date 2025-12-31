#!/bin/bash

# Script build và restart ứng dụng See Bói Backend
# - Build backend (NestJS + TypeScript)
# - Kiểm tra và áp dụng migration database nếu cần
# - Generate Prisma client
# - Nếu build thành công thì restart PM2 process
# - Có chức năng rollback nếu build thất bại

# Tắt set -e tạm thời để xử lý rollback
set +e

echo "=========================================="
echo "🔨 Build và Restart See Bói Backend"
echo "=========================================="
echo ""

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hàm rollback khi có lỗi
rollback() {
    echo ""
    echo -e "${RED}=========================================="
    echo "🔄 Đang rollback..."
    echo "==========================================${NC}"
    echo ""
    
    # Rollback migration nếu đã apply migration mới
    if [ "$MIGRATION_APPLIED" = true ]; then
        echo -e "${YELLOW}🔄 Phát hiện migration đã được apply trước khi build thất bại${NC}"
        cd "$BACKEND_DIR"
        if [ -f "prisma/schema.prisma" ]; then
            echo -e "${RED}⚠️  CẢNH BÁO: Migration đã được apply vào database!${NC}"
            echo -e "${YELLOW}   Prisma không hỗ trợ rollback migration tự động.${NC}"
            echo -e "${YELLOW}   Bạn cần rollback migration thủ công nếu cần:${NC}"
            echo -e "${BLUE}   1. Kiểm tra migration đã apply: npx prisma migrate status${NC}"
            echo -e "${BLUE}   2. Tạo migration rollback mới hoặc restore database từ backup${NC}"
            if [ -n "$PREVIOUS_MIGRATION" ]; then
                echo -e "${BLUE}   3. Migration trước đó: $PREVIOUS_MIGRATION${NC}"
            fi
        fi
    fi
    
    # Khôi phục dist folder nếu có backup
    if [ -n "$DIST_BACKUP_DIR" ] && [ -d "$DIST_BACKUP_DIR" ]; then
        echo -e "${YELLOW}🔄 Đang khôi phục dist folder...${NC}"
        cd "$BACKEND_DIR"
        if [ -d "dist" ]; then
            rm -rf dist
        fi
        mv "$DIST_BACKUP_DIR" dist
        echo -e "${GREEN}✓ Đã khôi phục dist folder${NC}"
    fi
    
    # Khôi phục PM2 processes nếu có backup
    if [ -n "$PM2_BACKUP_FILE" ] && [ -f "$PM2_BACKUP_FILE" ]; then
        echo -e "${YELLOW}🔄 Đang khôi phục PM2 processes...${NC}"
        pm2 delete all || true
        pm2 resurrect || pm2 start "$PM2_BACKUP_FILE" || true
        echo -e "${GREEN}✓ Đã khôi phục PM2 processes${NC}"
    else
        # Nếu không có backup, ít nhất cũng khởi động lại PM2
        echo -e "${YELLOW}🔄 Đang khởi động lại PM2 processes...${NC}"
        pm2 start all || true
    fi
    
    echo ""
    echo -e "${RED}=========================================="
    echo "❌ Rollback hoàn tất"
    echo "==========================================${NC}"
    echo ""
}

# Hàm cleanup backup files
cleanup_backup() {
    if [ -n "$DIST_BACKUP_DIR" ] && [ -d "$DIST_BACKUP_DIR" ]; then
        rm -rf "$DIST_BACKUP_DIR"
    fi
    if [ -n "$PM2_BACKUP_FILE" ] && [ -f "$PM2_BACKUP_FILE" ]; then
        rm -f "$PM2_BACKUP_FILE"
    fi
}

# Hàm exit handler
exit_handler() {
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ] && [ "$ROLLBACK_NEEDED" = true ]; then
        rollback
    fi
    exit $EXIT_CODE
}

# Trap để gọi rollback khi script exit với lỗi
trap exit_handler EXIT

# Đường dẫn đến thư mục backend (có thể thay đổi theo môi trường)
BACKEND_DIR="${BACKEND_DIR:-/opt/see_boi_backend}"
PM2_APP_NAME="see-boi-be"

# Biến để lưu trạng thái rollback
ROLLBACK_NEEDED=false
MIGRATION_APPLIED=false
PREVIOUS_MIGRATION=""
DIST_BACKUP_DIR=""
PM2_BACKUP_FILE=""

# Nếu không có BACKEND_DIR được set, sử dụng thư mục hiện tại
if [ "$BACKEND_DIR" = "/opt/see_boi_backend" ] && [ ! -d "$BACKEND_DIR" ]; then
    # Sử dụng thư mục hiện tại nếu đường dẫn mặc định không tồn tại
    BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo -e "${YELLOW}⚠️  Sử dụng thư mục hiện tại: $BACKEND_DIR${NC}"
fi

# Kiểm tra thư mục backend có tồn tại không
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Thư mục $BACKEND_DIR không tồn tại!${NC}"
    ROLLBACK_NEEDED=false  # Chưa có thay đổi nào, không cần rollback
    exit 1
fi

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js chưa được cài đặt. Vui lòng cài đặt Node.js trước.${NC}"
    ROLLBACK_NEEDED=false  # Chưa có thay đổi nào, không cần rollback
    exit 1
fi

# Kiểm tra PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 chưa được cài đặt. Vui lòng cài đặt PM2 trước.${NC}"
    ROLLBACK_NEEDED=false  # Chưa có thay đổi nào, không cần rollback
    exit 1
fi

# Kiểm tra lsof (để kiểm tra port)
if ! command -v lsof &> /dev/null; then
    echo -e "${YELLOW}⚠️  lsof chưa được cài đặt. Không thể kiểm tra Python service port.${NC}"
    SKIP_PORT_CHECK=true
else
    SKIP_PORT_CHECK=false
fi

# Backup trước khi thực hiện thay đổi
echo ""
echo -e "${BLUE}💾 Đang backup trạng thái hiện tại...${NC}"

# Backup PM2 processes
PM2_BACKUP_FILE="/tmp/pm2_backup_$(date +%s).json"
pm2 save 2>/dev/null || true
if [ -f ~/.pm2/dump.pm2 ]; then
    cp ~/.pm2/dump.pm2 "$PM2_BACKUP_FILE" 2>/dev/null || true
    echo -e "${GREEN}✓ Đã backup PM2 processes${NC}"
fi

# Backup dist folder nếu tồn tại
cd "$BACKEND_DIR" 2>/dev/null || true
if [ -d "dist" ]; then
    DIST_BACKUP_DIR="/tmp/dist_backup_$(date +%s)"
    cp -r dist "$DIST_BACKUP_DIR" 2>/dev/null || true
    echo -e "${GREEN}✓ Đã backup dist folder${NC}"
fi

ROLLBACK_NEEDED=true
echo -e "${GREEN}✓ Backup hoàn tất${NC}"
echo ""

# Dừng tất cả dịch vụ PM2 trước khi build
echo ""
echo -e "${YELLOW}⏸️  Đang dừng tất cả dịch vụ PM2...${NC}"
pm2 stop all || true  # || true để không dừng script nếu không có process nào đang chạy
echo -e "${GREEN}✓ Đã dừng tất cả dịch vụ PM2${NC}"
echo ""

echo -e "${BLUE}📂 Đang chuyển đến thư mục: $BACKEND_DIR${NC}"
cd "$BACKEND_DIR"

# Kiểm tra package.json có tồn tại không
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Không tìm thấy package.json trong $BACKEND_DIR${NC}"
    ROLLBACK_NEEDED=false  # Chưa có thay đổi nào, không cần rollback
    exit 1
fi

# Kiểm tra Prisma schema
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${YELLOW}⚠️  Không tìm thấy Prisma schema, bỏ qua bước generate Prisma client${NC}"
    SKIP_PRISMA=true
else
    SKIP_PRISMA=false
fi

# Thiết lập memory limit cho Node.js (2GB cho backend)
export NODE_OPTIONS="--max-old-space-size=2048"
echo -e "${BLUE}💾 Đã thiết lập Node.js memory limit: 2048MB${NC}"

# Kiểm tra và cài đặt dependencies nếu cần
echo ""
echo -e "${BLUE}📦 Kiểm tra dependencies...${NC}"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}   Đang cài đặt dependencies...${NC}"
    # Sử dụng npm ci nếu có package-lock.json (nhanh hơn và đảm bảo chính xác)
    if [ -f "package-lock.json" ]; then
        npm ci --prefer-offline --no-audit
    else
        # Fallback về npm install với các flag tối ưu
        npm install --prefer-offline --no-audit --legacy-peer-deps
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Đã cài đặt dependencies thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi cài đặt dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Dependencies đã được cài đặt và cập nhật${NC}"
fi

# Kiểm tra và xử lý Prisma (migration + generate) nếu có schema
if [ "$SKIP_PRISMA" = false ]; then
    echo ""
    echo -e "${BLUE}🔄 Kiểm tra migration database...${NC}"
    
    # Kiểm tra migration status (tắt set -e tạm thời để xử lý lỗi)
    set +e
    MIGRATION_STATUS=$(npx prisma migrate status 2>&1)
    MIGRATION_EXIT_CODE=$?
    set -e
    
    # Kiểm tra xem có migration mới chưa được apply không
    if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
        # Migration status thành công - không có migration pending
        if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
            echo -e "${GREEN}✓ Database đã được cập nhật (không có migration mới)${NC}"
        else
            # Có thể có thông báo khác, nhưng không có lỗi
            echo -e "${GREEN}✓ Database schema đã đồng bộ${NC}"
        fi
    elif echo "$MIGRATION_STATUS" | grep -qiE "(following migrations have not yet been applied|migrations have not yet been applied|pending migrations)"; then
        # Phát hiện migration mới chưa được apply
        echo -e "${YELLOW}   Phát hiện migration mới, đang áp dụng...${NC}"
        
        # Lưu migration hiện tại trước khi apply migration mới
        set +e
        CURRENT_MIGRATION=$(npx prisma migrate status 2>&1 | grep -oE "migrations/[0-9]+" | tail -1 || echo "")
        set -e
        PREVIOUS_MIGRATION="$CURRENT_MIGRATION"
        
        npx prisma migrate deploy
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Đã áp dụng migration thành công${NC}"
            MIGRATION_APPLIED=true
        else
            echo -e "${RED}❌ Lỗi khi áp dụng migration${NC}"
            ROLLBACK_NEEDED=true
            exit 1
        fi
    else
        # Có thể là lỗi kết nối database hoặc lỗi khác
        echo -e "${YELLOW}⚠️  Không thể kiểm tra migration status (có thể database chưa sẵn sàng)${NC}"
        echo -e "${YELLOW}   Bỏ qua bước migration, tiếp tục với generate...${NC}"
    fi
    
    # Luôn generate Prisma client sau khi kiểm tra migration
    echo ""
    echo -e "${BLUE}🔧 Đang generate Prisma client...${NC}"
    npx prisma generate
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Đã generate Prisma client thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi generate Prisma client${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🔨 Đang build backend (NestJS)...${NC}"
echo ""

# Bật lại set -e để dừng khi có lỗi
set -e

# Chạy npm run build và lưu exit code
set +e
npm run build
BUILD_EXIT_CODE=$?
set -e

# Kiểm tra kết quả build
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build thành công!${NC}"
    echo ""
    
    # Kiểm tra và khởi động Python service ở port 6677
    if [ "$SKIP_PORT_CHECK" = false ]; then
        echo -e "${BLUE}🐍 Kiểm tra Python service (port 6677)...${NC}"
        PYTHON_PORT_CHECK=$(lsof -ti :6677 2>/dev/null)
        if [ -z "$PYTHON_PORT_CHECK" ]; then
            echo -e "${YELLOW}   Python service chưa chạy, đang khởi động...${NC}"
            if [ -f "./run_python.sh" ]; then
                bash ./run_python.sh
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✓ Đã khởi động Python service thành công${NC}"
                else
                    echo -e "${YELLOW}⚠️  Có thể có lỗi khi khởi động Python service, nhưng tiếp tục...${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  Không tìm thấy run_python.sh, bỏ qua${NC}"
            fi
        else
            echo -e "${GREEN}✓ Python service đang chạy trên port 6677 (PID: $PYTHON_PORT_CHECK)${NC}"
        fi
        echo ""
    fi
    
    echo -e "${BLUE}▶️  Đang khởi động lại tất cả dịch vụ PM2...${NC}"
    
    # Khởi động lại tất cả dịch vụ PM2
    pm2 start all
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Đã khởi động lại tất cả dịch vụ PM2 thành công!${NC}"
        echo ""
        
        # Cleanup backup files vì build thành công
        cleanup_backup
        ROLLBACK_NEEDED=false
        
        echo "=========================================="
        echo -e "${GREEN}✅ Hoàn tất!${NC}"
        echo "=========================================="
    else
        echo ""
        echo -e "${RED}❌ Lỗi khi khởi động lại dịch vụ PM2${NC}"
        ROLLBACK_NEEDED=true
        exit 1
    fi
else
    echo ""
    echo -e "${RED}❌ Build thất bại!${NC}"
    echo ""
    # Rollback sẽ được gọi tự động bởi trap
    ROLLBACK_NEEDED=true
    exit 1
fi

