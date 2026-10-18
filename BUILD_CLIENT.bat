@echo off
title LearnBoard - Build Client
chcp 65001 > nul

echo ======================================================
echo    LEARNBOARD - BUILD CLIENT (Cap nhat giao dien)
echo ======================================================
echo.
echo Dang build lai giao dien web...
echo Vui long doi trong giay lat...
echo.

cd /d "%~dp0client"

call npx vite build --emptyOutDir false

if errorlevel 1 (
    echo.
    echo ======================================================
    echo    BUILD THAT BAI^^!
    echo    Thu dong trinh duyet va server cu, roi chay lai.
    echo ======================================================
) else (
    echo.
    echo ======================================================
    echo    BUILD THANH CONG^^!
    echo    Chay CHAY_LOP_HOC.bat de khoi dong server.
    echo ======================================================
)

echo.
pause
