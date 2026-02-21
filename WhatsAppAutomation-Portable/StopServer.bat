@echo off
echo Stopping WhatsApp Automation server...
taskkill /F /IM node.exe 2>nul
echo Server stopped.
timeout /t 2 >nul
