# Quick Start Script for AgroNexus Backend
# This script helps you start the backend server

Write-Host "🚀 Starting AgroNexus Backend..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  Warning: backend\.env file not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create backend\.env with your Supabase credentials:" -ForegroundColor Yellow
    Write-Host "  1. Copy backend\.env.example to backend\.env" -ForegroundColor Gray
    Write-Host "  2. Edit backend\.env and add:" -ForegroundColor Gray
    Write-Host "     - SUPABASE_URL" -ForegroundColor Gray
    Write-Host "     - SUPABASE_KEY" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
try {
    python -c "import fastapi" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Dependencies not installed. Installing..." -ForegroundColor Yellow
        cd backend
        pip install -r requirements.txt
        cd ..
    } else {
        Write-Host "✓ Dependencies OK" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not check dependencies. Make sure Python is installed." -ForegroundColor Yellow
}

# Start the backend
Write-Host ""
Write-Host "Starting backend server on http://localhost:8000..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

