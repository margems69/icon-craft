@echo off
title Icon Craft — Dev Server
cd /d "E:\icon-craft"

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║            Icon Craft — Dev Server           ║
echo  ║         (runs via WSL / Ubuntu)              ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Check WSL
where wsl >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] WSL not found.
    echo  Make sure Windows Subsystem for Linux is installed.
    echo.
    pause
    exit /b 1
)
echo  [OK] WSL found

:: Check that the project path is accessible from WSL
wsl test -d /mnt/e/icon-craft
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Cannot access E:\icon-craft from WSL.
    echo.
    pause
    exit /b 1
)
echo  [OK] Project accessible from WSL

:: Check node_modules
wsl test -f /mnt/e/icon-craft/node_modules/.package-lock.json
if %ERRORLEVEL% neq 0 (
    echo  [..] Installing dependencies (first time)...
    wsl cd /mnt/e/icon-craft ^&^& npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] npm install failed
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed
) else (
    echo  [OK] Dependencies ready
)

echo.
echo  Starting server...
echo  Open http://localhost:3000 in your browser
echo  Press Ctrl+C to stop the server
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║          Server output below                 ║
echo  ╚══════════════════════════════════════════════╝
echo.

wsl bash -c "cd /mnt/e/icon-craft && npx next dev -p 3000"

echo.
echo  Server stopped.
pause
