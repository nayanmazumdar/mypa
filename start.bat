@echo off
echo.
echo  ====================================
echo   MyPA - Starting Application...
echo  ====================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
  echo  Installing dependencies...
  npm install
  echo.
)

echo  Opening browser...
start http://localhost:3000

echo  Starting server...
node server.js
