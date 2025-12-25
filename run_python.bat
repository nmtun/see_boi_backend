@echo off
REM Script chạy Python service cho Windows
REM Tự động setup venv, cài đặt dependencies, giải phóng port và khởi động service

setlocal enabledelayedexpansion

echo.
echo ========================================
echo    KHOI DONG PYTHON SERVICE - WINDOWS
echo ========================================
echo.

REM Kiểm tra xem đã ở đúng thư mục chưa
if not exist "package.json" (
    echo [ERROR] Khong tim thay package.json. Vui long chay script trong thu muc goc cua du an.
    pause
    exit /b 1
)

REM Kiểm tra thư mục python_services
if not exist "python_services" (
    echo [ERROR] Khong tim thay thu muc python_services.
    pause
    exit /b 1
)

REM Bước 1: Kiểm tra Python
echo [1/7] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo    [ERROR] Python chua duoc cai dat. Vui long cai dat Python 3.8+ truoc.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo    [OK] !PYTHON_VERSION!

REM Bước 2: Kiểm tra pip
echo.
echo [2/7] Kiem tra pip...
pip --version >nul 2>&1
if errorlevel 1 (
    echo    [ERROR] pip chua duoc cai dat. Vui long cai dat pip truoc.
    pause
    exit /b 1
)
echo    [OK] pip da duoc cai dat

REM Bước 3: Tạo virtual environment
echo.
echo [3/7] Tao virtual environment...
cd python_services
if exist "venv" (
    echo    [INFO] Virtual environment da ton tai, bo qua...
) else (
    echo    Dang tao virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo    [ERROR] Loi khi tao virtual environment
        cd ..
        pause
        exit /b 1
    )
    echo    [OK] Da tao virtual environment
)

REM Bước 4: Cài đặt dependencies
echo.
echo [4/7] Cai dat Python dependencies...
if not exist "requirements.txt" (
    echo    [ERROR] Khong tim thay requirements.txt trong python_services
    cd ..
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
echo    Dang cai dat dependencies tu requirements.txt...
call pip install -r requirements.txt
if errorlevel 1 (
    echo    [ERROR] Loi khi cai dat Python dependencies
    call venv\Scripts\deactivate.bat
    cd ..
    pause
    exit /b 1
)
echo    [OK] Da cai dat Python dependencies

REM Bước 5: Kiểm tra file model
echo.
echo [5/7] Kiem tra file model...
if not exist "face_landmarker.task" (
    echo    [WARNING] Khong tim thay face_landmarker.task trong python_services
    if exist "..\face_landmarker.task" (
        echo    Dang copy file model tu thu muc goc...
        copy ..\face_landmarker.task face_landmarker.task >nul
        echo    [OK] Da copy file model
    ) else (
        echo    [ERROR] Khong tim thay file model. Vui long dam bao file face_landmarker.task co trong python_services\ hoac thu muc goc.
        call venv\Scripts\deactivate.bat
        cd ..
        pause
        exit /b 1
    )
) else (
    echo    [OK] File model da ton tai
)

REM Bước 6: Giải phóng port 6677
echo.
echo [6/7] Kiem tra va giai phong port 6677...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :6677') do (
    echo    Dang dung process PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM Kiểm tra lại port
netstat -ano | findstr :6677 >nul 2>&1
if errorlevel 1 (
    echo    [OK] Port 6677 da duoc giai phong
) else (
    echo    [WARNING] Port 6677 van con process dang su dung. Kiem tra thu cong.
)

REM Bước 7: Khởi động Python service
echo.
echo [7/7] Khoi dong Python service...
echo    Dang khoi dong uvicorn tren port 6677...

REM Khởi động service trong cửa sổ mới với output redirect vào log file
REM Process sẽ chạy độc lập, không bị dừng khi script kết thúc
start "Python Service" cmd /k "cd /d %CD% && venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 6677 > ..\python_service.log 2>&1"
cd ..

timeout /t 3 /nobreak >nul

REM Kiểm tra xem service có phản hồi không
curl -s http://127.0.0.1:6677/docs >nul 2>&1
if errorlevel 1 (
    echo    [WARNING] Service da khoi dong nhung chua san sang. Kiem tra log: python_service.log
) else (
    echo    [OK] Service dang chay thanh cong
)

echo.
echo ========================================
echo    PYTHON SERVICE DA KHOI DONG!
echo ========================================
echo.
echo [OK] Process dang chay doc lap trong cua so "Python Service"
echo [OK] Service se tiep tuc chay ngay ca khi ban dong cua so script nay
echo.
echo Swagger: http://127.0.0.1:6677/docs
echo Logs: python_service.log
echo.
echo De dung service:
echo   - Dong cua so "Python Service"
echo   - Hoac tim process uvicorn trong Task Manager va End Task
echo.
pause

