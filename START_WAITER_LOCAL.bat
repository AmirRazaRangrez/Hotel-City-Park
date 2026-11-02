@echo off
title Hotel City Park - Waiter Order Panel (Local Live)
cd /d "%~dp0"

echo ==================================================================
echo       HOTEL CITY PARK - WAITER ORDER PANEL (LOCAL LIVE)
echo ==================================================================
echo.
echo [1/2] Checking Node.js installation...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org or verify your installation.
    pause
    exit /b 1
)

echo [2/2] Launching Local CRM and Waiter Panel...
echo.
node scripts\start_waiter.js %*

pause
