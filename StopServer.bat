@echo off
title Stop WhatsApp Server
color 0C

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     STOPPING WHATSAPP SERVER                                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Kill node processes
echo [INFO] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

:: Kill processes on port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process on port 3001 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] Server stopped successfully!
echo.
timeout /t 3
