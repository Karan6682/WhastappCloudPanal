@echo off
title WhatsApp Business Automation Server
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     WHATSAPP BUSINESS AUTOMATION SERVER                      ║
echo ║     Powered by STARNEXT TECHNOLOGIES                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Get the directory where the batch file is located
cd /d "%~dp0"
echo [INFO] Working Directory: %CD%
echo.

:: Check if Node.js is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js found: 
node --version
echo.

:: Check if node_modules exists
echo [2/5] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo [INFO] This may take a few minutes on first run...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
) else (
    echo [OK] Dependencies already installed.
)
echo.

:: Check if backend node_modules exists
echo [3/5] Checking backend dependencies...
if exist "backend\package.json" (
    if not exist "backend\node_modules" (
        echo [INFO] Backend dependencies not found. Installing...
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
        echo [OK] Backend dependencies already installed.
    )
) else (
    echo [OK] No separate backend package.json.
)
echo.

:: Kill any existing node processes on port 3001
echo [4/5] Preparing server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [INFO] Killing existing process on port 3001 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo [OK] Port 3001 is ready.
echo.

:: Start the server
echo [5/5] Starting WhatsApp Automation Server...
echo.
echo ══════════════════════════════════════════════════════════════
echo.

:: Start server using npm start
npm start

:: If server stops, show message
echo.
echo [INFO] Server has stopped.
pause
