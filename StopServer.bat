@echo off
echo Stopping WhatsApp Server...

:: Kill node processes on port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo Server stopped!
timeout /t 2 /nobreak >nul
