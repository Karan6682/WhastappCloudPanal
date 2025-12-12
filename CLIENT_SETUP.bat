@echo off
title WhatsApp Automation - Client Setup
color 0A
cls

echo ========================================
echo   WHATSAPP AUTOMATION - CLIENT SETUP
echo   One-Time Installation
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js not found!
    echo.
    echo Please install Node.js first:
    echo 1. Go to: https://nodejs.org/
    echo 2. Download LTS version
    echo 3. Install it
    echo 4. Run this setup again
    echo.
    start https://nodejs.org/
    pause
    exit /b
)

echo [OK] Node.js found!
echo.
echo [1/3] Installing dependencies...
call npm install --production
echo.
echo [2/3] Creating desktop shortcut...

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%USERPROFILE%\Desktop\WhatsApp Automation.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%~dp0QuickStart.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Description = "WhatsApp Automation" >> CreateShortcut.vbs
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,14" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs
cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo.
echo [3/3] Setup complete!
echo.
echo ========================================
echo   SETUP COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Desktop pe "WhatsApp Automation" shortcut ban gaya hai.
echo.
echo Ab kya karna hai:
echo 1. Desktop pe "WhatsApp Automation" icon pe double-click karo
echo 2. Browser mein login karo (admin/admin123)
echo 3. WhatsApp QR scan karo
echo 4. Messages bhejo!
echo.
echo ========================================
pause
