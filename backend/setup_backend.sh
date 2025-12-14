#!/bin/bash
# AgroNexus Backend Setup Script
# This script helps set up the backend environment

echo "🚀 AgroNexus Backend Setup"
echo "========================="
echo ""

# Check if Python is installed
echo "1️⃣ Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   ✓ Python found: $PYTHON_VERSION"
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo "   ✓ Python found: $PYTHON_VERSION"
    PYTHON_CMD=python
else
    echo "   ✗ Python not found. Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Check if pip is installed
echo ""
echo "2️⃣ Checking pip installation..."
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version)
    echo "   ✓ pip found: $PIP_VERSION"
    PIP_CMD=pip3
elif command -v pip &> /dev/null; then
    PIP_VERSION=$(pip --version)
    echo "   ✓ pip found: $PIP_VERSION"
    PIP_CMD=pip
else
    echo "   ✗ pip not found. Please install pip."
    exit 1
fi

# Install dependencies
echo ""
echo "3️⃣ Installing Python dependencies..."
if $PIP_CMD install -r requirements.txt; then
    echo "   ✓ Dependencies installed successfully"
else
    echo "   ✗ Failed to install dependencies. Please check the error above."
    exit 1
fi

# Check for .env file
echo ""
echo "4️⃣ Checking environment configuration..."
if [ -f ".env" ]; then
    echo "   ✓ .env file found"
    
    # Check if required variables are set
    if grep -q "SUPABASE_URL=" .env && grep -q "SUPABASE_KEY=" .env; then
        echo "   ✓ SUPABASE_URL and SUPABASE_KEY are configured"
    else
        echo "   ⚠ SUPABASE_URL or SUPABASE_KEY may be missing"
    fi
else
    echo "   ⚠ .env file not found"
    echo ""
    echo "   To create .env file:"
    echo "   1. Copy .env.example to .env:"
    echo "      cp .env.example .env"
    echo "   2. Edit .env and add your Supabase credentials:"
    echo "      - SUPABASE_URL: Get from https://app.supabase.com"
    echo "      - SUPABASE_KEY: Get from https://app.supabase.com"
    echo ""
fi

# Verify backend can start
echo ""
echo "5️⃣ Verifying backend configuration..."
if $PYTHON_CMD -c "import sys; sys.path.insert(0, '.'); from main import app; print('   ✓ Backend configuration is valid')" 2>&1; then
    echo "   ✓ Backend can start successfully"
else
    echo "   ⚠ Backend configuration has issues. Check the error above."
    echo "   Common issues:"
    echo "   - Missing SUPABASE_URL or SUPABASE_KEY in .env"
    echo "   - Invalid Supabase credentials"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the backend server:"
echo "   $PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""


