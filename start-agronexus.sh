#!/bin/bash
# AgroNexus Integration Fixes - Startup Script

echo "🚀 Starting AgroNexus with Integration Fixes"
echo "=========================================="

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "backend/main.py" ]; then
    echo "❌ Please run this script from the AgroNexus root directory"
    exit 1
fi

# Install backend dependencies if needed
echo "📦 Checking backend dependencies..."
if [ ! -d "backend/__pycache__" ]; then
    echo "Installing backend dependencies..."
    pip install -r backend/requirements.txt
fi

# Install frontend dependencies if needed
echo "📦 Checking frontend dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start backend in background
echo "🔧 Starting backend on port 8000..."
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Test backend connectivity
echo "🔍 Testing backend connectivity..."
if python test_integration.py; then
    echo "✅ Backend is running and responding"
else
    echo "❌ Backend test failed. Please check the logs."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend on port 8080..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 AgroNexus is starting up!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
