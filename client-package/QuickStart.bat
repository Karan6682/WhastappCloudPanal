@echo off
setlocal EnableDelayedExpansion
title WhatsApp Business Automation
color 0A

echo.
echo ========================================================
echo    WHATSAPP BUSINESS AUTOMATION - QUICK START
echo    Powered by STARNEXT TECHNOLOGIES
echo ========================================================
echo.

cd /d "%~dp0"
echo [INFO] Working Directory: %CD%
echo.

echo [1/4] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js not found. Opening download page...
    start https://nodejs.org/
    echo Please install Node.js and run this again.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js: %%i
echo.

echo [2/4] Checking dependencies...
if not exist "node_modules" (
    echo [ERROR] node_modules folder not found!
    echo Please extract all files properly.
    pause
    exit /b 1
) else (
    echo [OK] Dependencies found.
)
echo.

echo [3/4] Clearing port 3001...
for /f "tokens=5" %%a in ('netstat -aon 2^^^>nul ^^^| findstr ":3001" ^^^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)
timeout /t 2 /nobreak >nul
echo [OK] Port ready.
echo.

echo [4/4] Starting server...
echo.
echo ========================================================
echo    SERVER RUNNING - http://localhost:3001
echo    DO NOT CLOSE THIS WINDOW!
echo ========================================================
echo.

start http://localhost:3001
node backend/server-simple.js

echo SERVER STOPPED. Press any key to restart...
pause >nul
