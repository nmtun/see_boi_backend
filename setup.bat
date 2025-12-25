@echo off
REM Script setup dự án cho Windows
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    SETUP DU AN - WINDOWS
echo ========================================
echo.

REM Kiểm tra xem đã ở đúng thư mục chưa
if not exist "package.json" (
    echo [ERROR] Khong tim thay package.json. Vui long chay script trong thu muc goc cua du an.
    pause
    exit /b 1
)

REM Bước 1: Kiểm tra và tạo file .env từ .env.example
echo [1/6] Kiem tra va tao file .env...
if not exist ".env.example" (
    echo    [ERROR] Khong tim thay file .env.example
    pause
    exit /b 1
)

if exist ".env" (
    echo    Xoa file .env cu...
    del .env
)

echo    Tao file .env moi tu .env.example...
copy .env.example .env >nul
if errorlevel 1 (
    echo    [ERROR] Loi khi tao file .env
    pause
    exit /b 1
)
echo    [OK] Da tao file .env tu .env.example

REM Bước 2: Cài đặt dependencies
echo.
echo [2/6] Cai dat dependencies...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Loi khi cai dat dependencies
        pause
        exit /b 1
    )
    echo    [OK] Da cai dat dependencies
) else (
    echo    [OK] Dependencies da duoc cai dat
)

REM Bước 3: Kiểm tra Docker
echo.
echo [3/6] Kiem tra Docker...
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker chua duoc cai dat. Vui long cai dat Docker truoc.
    pause
    exit /b 1
)
echo    [OK] Docker da duoc cai dat

REM Bước 4: Khởi động PostgreSQL container
echo.
echo [4/6] Khoi dong PostgreSQL container...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Loi khi khoi dong Docker container
    pause
    exit /b 1
)

REM Đợi PostgreSQL sẵn sàng
echo    Doi PostgreSQL khoi dong...
timeout /t 5 /nobreak >nul

REM Bước 5: Migration database
echo.
echo [5/6] Chay migration database...
call npx prisma migrate deploy
if errorlevel 1 (
    echo [ERROR] Loi khi chay migration
    pause
    exit /b 1
)

call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Loi khi generate Prisma Client
    pause
    exit /b 1
)
echo    [OK] Da chay migration va generate Prisma Client

REM Bước 6: Setup Python Service
echo.
echo [6/7] Setup Python Service...
if exist "python_services" (
    echo    Kiem tra Python...
    python --version >nul 2>&1
    if errorlevel 1 (
        echo    [WARNING] Python chua duoc cai dat. Vui long cai dat Python 3.8+ truoc.
    ) else (
        echo    [OK] Python da duoc cai dat
        echo    Kiem tra pip...
        pip --version >nul 2>&1
        if errorlevel 1 (
            echo    [WARNING] pip chua duoc cai dat. Vui long cai dat pip truoc.
        ) else (
            echo    [OK] pip da duoc cai dat
            cd python_services
            if exist "venv" (
                echo    [INFO] Virtual environment da ton tai, bo qua...
            ) else (
                echo    Tao virtual environment...
                python -m venv venv
                if errorlevel 1 (
                    echo    [ERROR] Loi khi tao virtual environment
                    cd ..
                    pause
                    exit /b 1
                ) else (
                    echo    [OK] Da tao virtual environment
                )
            )
            if exist "requirements.txt" (
                echo    Cai dat Python dependencies...
                call venv\Scripts\activate.bat
                call pip install -r requirements.txt
                if errorlevel 1 (
                    echo    [WARNING] Co loi khi cai dat Python dependencies
                ) else (
                    echo    [OK] Da cai dat Python dependencies
                )
                call venv\Scripts\deactivate.bat
            ) else (
                echo    [WARNING] Khong tim thay requirements.txt trong python_services
            )
            cd ..
        )
    )
) else (
    echo    [WARNING] Thu muc python_services khong ton tai
)

REM Bước 7: Import dữ liệu seed
echo.
echo [7/7] Import du lieu seed...

REM Import users qua seed script
if exist "seed-users.ts" (
    echo    Import users...
    call npx ts-node seed-users.ts
    if errorlevel 1 (
        echo    [WARNING] Co loi khi import users (co the da ton tai)
    ) else (
        echo    [OK] Da import users
    )
)

REM Import dữ liệu từ seed.sql
if exist "seed.sql" (
    echo    Import du lieu tu seed.sql...
    type seed.sql | docker exec -i my-postgresae psql -U admin -d mydb
    if errorlevel 1 (
        echo    [WARNING] Co loi khi import seed.sql (co the da ton tai)
    ) else (
        echo    [OK] Da import seed.sql
    )
)

echo.
echo ========================================
echo    SETUP HOAN TAT!
echo ========================================
echo.
echo De chay du an:
echo    - Tat ca services: run.bat
echo    - Chi NestJS: npm run start:dev
echo    - Chi Python Service:
echo      cd python_services
echo      venv\Scripts\activate
echo      uvicorn main:app --reload --host 0.0.0.0 --port 6677
echo.
pause

