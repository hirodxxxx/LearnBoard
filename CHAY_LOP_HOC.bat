@echo off
title LearnBoard - Khoi dong Lop Hoc
chcp 65001 > nul

echo ======================================================
echo    LEARNBOARD - BANG DEN DAY HOC VA VIDEO CALL 1-1
echo ======================================================
echo.

REM --- Buoc 1: Kiem tra node_modules server ---
if not exist "%~dp0node_modules\" (
    echo [1/3] Chua co thu vien server. Dang cai dat...
    cd /d "%~dp0"
    call npm install
    if errorlevel 1 (
        echo LOI: Cai dat thu vien server that bai^^!
        pause
        exit /b 1
    )
    echo     Xong^^!
) else (
    echo [1/3] Thu vien server da co. Bo qua.
)

REM --- Buoc 2: Kiem tra node_modules client ---
if not exist "%~dp0client\node_modules\" (
    echo [2/3] Chua co thu vien client. Dang cai dat...
    cd /d "%~dp0client"
    call npm install
    if errorlevel 1 (
        echo LOI: Cai dat thu vien client that bai^^!
        pause
        exit /b 1
    )
    echo     Xong^^!
) else (
    echo [2/3] Thu vien client da co. Bo qua.
)

REM --- Buoc 3: Kiem tra ban build client ---
if not exist "%~dp0client\dist\index.html" (
    echo [3/3] Chua co ban build. Dang build giao dien...
    cd /d "%~dp0client"
    call npx vite build --emptyOutDir false
    if errorlevel 1 (
        echo LOI: Build giao dien that bai^^!
        pause
        exit /b 1
    )
    echo     Xong^^!
) else (
    echo [3/3] Ban build da co. Bo qua.
)

echo.
echo ======================================================
echo Dang kiem tra cong 5000 va khoi dong Server...

REM Giai phong cong 5000 neu co tien trinh cu
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { taskkill /F /PID $_.OwningProcess }" >nul 2>&1

echo Dang tao link Cloudflare Tunnel cho hoc sinh...
echo Vui long doi trong giay lat...
echo.

REM Mo trinh duyet sau 3 giay
start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5000'"

REM Khoi chay ung dung va tunnel
cd /d "%~dp0"
call npm run app
pause
