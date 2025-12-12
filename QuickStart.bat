@echo off
title WhatsApp Business Automation - Quick Start
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     WHATSAPP BUSINESS AUTOMATION - QUICK START               ║
echo ║     Powered by STARNEXT TECHNOLOGIES                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Get the directory where the batch file is located
cd /d "%~dp0"
echo [INFO] Working Directory: %CD%
echo.

:: Check if Node.js is installed
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    echo Press any key to open Node.js download page...
    pause >nul
    start https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js found: %NODE_VER%
echo.

:: Check if node_modules exists
echo [2/6] Checking main dependencies...
if not exist "node_modules" (
    echo [INFO] Installing dependencies... (First time setup)
    echo [INFO] Please wait, this may take 2-5 minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        echo [TIP] Try running as Administrator
        pause
        exit /b 1
    )
    echo.
    echo [OK] Main dependencies installed!
) else (
    echo [OK] Main dependencies OK.
)
echo.

:: Check if backend node_modules exists  
echo [3/6] Checking backend dependencies...
if exist "backend\package.json" (
    if not exist "backend\node_modules" (
        echo [INFO] Installing backend dependencies...
        cd backend
        call npm install
        cd ..
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to install backend dependencies!
            pause
            exit /b 1
        )
        echo [OK] Backend dependencies installed!
    ) else (
        echo [OK] Backend dependencies OK.
    )
) else (
    echo [OK] No separate backend package.json found.
)
echo.

:: Kill any existing node processes on port 3001
echo [4/6] Clearing port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [INFO] Stopping existing server (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo [OK] Port ready.
echo.

:: Open browser after 3 seconds (in background)
echo [5/6] Scheduling browser launch...
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3001/app.html"
echo [OK] Browser will open in 4 seconds.
echo.

:: Start the server
echo [6/6] Starting server...
echo.
echo ══════════════════════════════════════════════════════════════
echo   SERVER STARTING - DO NOT CLOSE THIS WINDOW!
echo   Dashboard: http://localhost:3001/app.html
echo   API Docs:  http://localhost:3001/api-docs.html
echo   Login:     admin / admin123
echo ══════════════════════════════════════════════════════════════
echo.

:: Start server using npm start (which now runs backend/server-simple.js)
npm start

:: If server stops
echo.
echo ══════════════════════════════════════════════════════════════
echo   SERVER STOPPED
echo   Press any key to restart, or close this window to exit.
echo ══════════════════════════════════════════════════════════════
pause >nul
call "%~dp0QuickStart.bat"
