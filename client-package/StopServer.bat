@echo off
echo Stopping WhatsApp Server...
taskkill /f /im node.exe >nul 2>nul
echo Server stopped!
timeout /t 2 >nul
