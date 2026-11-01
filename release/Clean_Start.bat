@echo off
title Hotel City Park CRM - Clean Start
color 0A
echo =======================================================
echo          HOTEL CITY PARK CRM - CLEAN RESTART           
echo =======================================================
echo.
echo [1/4] Closing any running Hotel City Park CRM instances...
taskkill /F /IM "Hotel City Park CRM.exe" >nul 2>&1
taskkill /F /IM "HotelCityPark-Admin.exe" >nul 2>&1
taskkill /F /IM "HotelCityPark.exe" >nul 2>&1

echo [2/4] Terminating any old background server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo       Stopping background PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [3/4] Clearing stale client cache...
rd /s /q "%APPDATA%\Hotel City Park CRM\Cache" >nul 2>&1
rd /s /q "%APPDATA%\Hotel City Park CRM\Code Cache" >nul 2>&1
rd /s /q "%APPDATA%\Hotel City Park CRM\GPUCache" >nul 2>&1
rd /s /q "%APPDATA%\Hotel City Park CRM\Service Worker" >nul 2>&1

echo [4/4] Starting fresh Hotel City Park CRM...
echo.
start "" "%~dp0HotelCityPark.exe"

echo =======================================================
echo  [OK] CRM launched fresh!
echo =======================================================
timeout /t 3 >nul

