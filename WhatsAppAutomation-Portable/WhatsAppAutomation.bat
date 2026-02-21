@echo off
title WhatsApp Automation - Portable
echo ========================================
echo   WhatsApp Automation - Starting...
echo ========================================
echo.

cd /d "%~dp0"

set PATH=%~dp0node;%PATH%

echo Installing dependencies...
cd backend
"%~dp0node\npm.cmd" install express cors multer mssql qrcode uuid socket.io @whiskeysockets/baileys --silent 2>nul
cd ..

echo.
echo Starting server on http://localhost:3001
echo.
echo Open your browser and go to: http://localhost:3001/app.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================

"%~dp0node\node.exe" backend/server-simple.js

pause
