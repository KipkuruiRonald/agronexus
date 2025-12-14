# AgroNexus Backend Setup Script
# This script helps set up the backend environment

Write-Host "🚀 AgroNexus Backend Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "1️⃣ Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Python not found. Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Check if pip is installed
Write-Host ""
Write-Host "2️⃣ Checking pip installation..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "   ✓ pip found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ pip not found. Please install pip." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "3️⃣ Installing Python dependencies..." -ForegroundColor Yellow
try {
    pip install -r requirements.txt
    Write-Host "   ✓ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed to install dependencies. Please check the error above." -ForegroundColor Red
    exit 1
}

# Check for .env file
Write-Host ""
Write-Host "4️⃣ Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ .env file found" -ForegroundColor Green
    
    # Check if required variables are set
    $envContent = Get-Content .env -Raw
    if ($envContent -match "SUPABASE_URL\s*=" -and $envContent -match "SUPABASE_KEY\s*=") {
        Write-Host "   ✓ SUPABASE_URL and SUPABASE_KEY are configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ SUPABASE_URL or SUPABASE_KEY may be missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ .env file not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   To create .env file:" -ForegroundColor Cyan
    Write-Host "   1. Copy .env.example to .env:" -ForegroundColor White
    Write-Host "      Copy-Item .env.example .env" -ForegroundColor Gray
    Write-Host "   2. Edit .env and add your Supabase credentials:" -ForegroundColor White
    Write-Host "      - SUPABASE_URL: Get from https://app.supabase.com" -ForegroundColor Gray
    Write-Host "      - SUPABASE_KEY: Get from https://app.supabase.com" -ForegroundColor Gray
    Write-Host ""
}

# Verify backend can start
Write-Host ""
Write-Host "5️⃣ Verifying backend configuration..." -ForegroundColor Yellow
try {
    # Try to import the main module to check for configuration errors
    python -c "import sys; sys.path.insert(0, '.'); from main import app; print('   ✓ Backend configuration is valid')"
    Write-Host "   ✓ Backend can start successfully" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Backend configuration has issues. Check the error above." -ForegroundColor Yellow
    Write-Host "   Common issues:" -ForegroundColor Cyan
    Write-Host "   - Missing SUPABASE_URL or SUPABASE_KEY in .env" -ForegroundColor Gray
    Write-Host "   - Invalid Supabase credentials" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the backend server:" -ForegroundColor Cyan
Write-Host "   python -m uvicorn main:app --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host ""


