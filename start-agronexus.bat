@echo off
REM AgroNexus Integration Fixes - Windows Startup Script

echo 🚀 Starting AgroNexus with Integration Fixes
echo ==========================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if Node.js is available  
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 16+
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "backend\main.py" (
    echo ❌ Please run this script from the AgroNexus root directory
    pause
    exit /b 1
)

REM Install backend dependencies if needed
echo 📦 Checking backend dependencies...
cd backend
python -m pip install -r requirements.txt
cd ..

REM Install frontend dependencies if needed
echo 📦 Checking frontend dependencies...
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

REM Start backend
echo 🔧 Starting backend on port 8000...
start "AgroNexus Backend" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Test backend connectivity
echo 🔍 Testing backend connectivity...
python test_integration.py

if errorlevel 1 (
    echo ❌ Backend test failed. Please check the logs.
    pause
    exit /b 1
)

echo ✅ Backend is running and responding

REM Start frontend
echo 🎨 Starting frontend on port 8080...
start "AgroNexus Frontend" cmd /k "npm run dev"

echo.
echo 🎉 AgroNexus is starting up!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080
echo.
echo Close the command windows to stop the services

pause
