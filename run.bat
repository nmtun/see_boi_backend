@echo off
REM Script chạy dự án cho Windows (sau khi đã setup)
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    KHOI DONG DU AN - WINDOWS
echo ========================================
echo.

REM Kiểm tra xem đã ở đúng thư mục chưa
if not exist "package.json" (
    echo [ERROR] Khong tim thay package.json. Vui long chay script trong thu muc goc cua du an.
    pause
    exit /b 1
)

REM Kiểm tra file .env
if not exist ".env" (
    echo [ERROR] Khong tim thay file .env. Vui long chay setup.bat truoc.
    pause
    exit /b 1
)

REM Kiểm tra Docker container
echo [INFO] Kiem tra PostgreSQL container...
docker ps | findstr "my-postgresae" >nul 2>&1
if errorlevel 1 (
    echo    Container chua chay, dang khoi dong...
    docker-compose up -d
    timeout /t 3 /nobreak >nul
)
echo    [OK] PostgreSQL container dang chay

REM Chạy NestJS project
echo.
echo [INFO] Dang khoi dong NestJS server...
echo.
call npm run start:dev

