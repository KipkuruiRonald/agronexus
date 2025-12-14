# Frontend-Backend Connection Setup Guide

## ✅ Configuration Complete

The UI and FastAPI backend are now properly configured to connect. Here's what has been set up:

## What Was Fixed

### 1. **Backend Configuration** ✅
- ✅ Created `backend/.env.example` template with required environment variables
- ✅ Updated `backend/requirements.txt` to use `PyJWT` instead of `python-jose`
- ✅ Added error handling for missing Supabase credentials
- ✅ Backend now returns `full_name` in all user responses (computed from `first_name` + `last_name`)
- ✅ Backend includes `username` in all user responses

### 2. **Frontend Configuration** ✅
- ✅ Created `.env.development` for frontend environment variables
- ✅ Updated `User` interface to accept both `full_name` and `first_name`/`last_name`
- ✅ Added fallback logic to compute `full_name` if backend doesn't provide it
- ✅ Vite proxy configured to forward `/api` requests to `http://localhost:8000`

### 3. **Field Mapping** ✅
- ✅ Frontend sends `first_name` and `last_name` (not `full_name`)
- ✅ Backend accepts `first_name`, `last_name`, and `username`
- ✅ Backend returns `full_name` (computed) + `first_name` + `last_name` + `username`
- ✅ Frontend handles both formats gracefully

## Setup Instructions

### Step 1: Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your Supabase credentials:
   # - SUPABASE_URL: Get from https://app.supabase.com → Settings → API
   # - SUPABASE_KEY: Get from https://app.supabase.com → Settings → API
   ```

3. **Set up database schema:**
   - Go to your Supabase project SQL Editor
   - Run the SQL from `supabase_setup.sql` (in project root)

4. **Start the backend:**
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

   You should see:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

### Step 2: Frontend Setup

1. **Install Node dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the frontend:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:8080`

### Step 3: Verify Connection

1. **Test backend health:**
   ```bash
   curl http://localhost:8000/api/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "..."
   }
   ```

2. **Test from frontend:**
   - Open `http://localhost:8080` in your browser
   - Open browser DevTools → Network tab
   - Try to register or login
   - Check that API requests go to `/api/auth/register` or `/api/auth/login`
   - Verify requests are proxied to `http://localhost:8000`

## Connection Flow

```
Frontend (localhost:8080)
    ↓
Makes request to /api/auth/register
    ↓
Vite Proxy intercepts /api requests
    ↓
Forwards to http://localhost:8000/api/auth/register
    ↓
FastAPI Backend processes request
    ↓
Connects to Supabase database
    ↓
Returns response with user + token
    ↓
Frontend receives response and stores token
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Health Check
- `GET /api/health` - Check backend and database status

## Troubleshooting

### Backend won't start

**Error: Missing SUPABASE_URL or SUPABASE_KEY**
- Solution: Create `backend/.env` file with your Supabase credentials
- See `backend/.env.example` for template

**Error: Failed to initialize Supabase client**
- Solution: Verify your `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check that your Supabase project is active

**Error: Port 8000 already in use**
- Solution: Use a different port: `python -m uvicorn main:app --host 0.0.0.0 --port 8001`
- Update `.env.development`: `VITE_API_BASE=http://localhost:8001`

### Frontend can't connect to backend

**Error: Network Error or Connection Refused**
- Solution: Make sure backend is running on port 8000
- Check that Vite proxy is configured correctly in `vite.config.ts`

**Error: CORS error**
- Solution: Backend CORS is configured for `localhost:8080`, `localhost:3000`, and `localhost:5173`
- If using a different port, update CORS in `backend/main.py`

**Error: 404 Not Found**
- Solution: Verify the API endpoint path matches backend routes
- Check that requests are going to `/api/...` (not `/api/api/...`)

### Database errors

**Error: Table 'users' does not exist**
- Solution: Run the SQL from `supabase_setup.sql` in your Supabase SQL Editor

**Error: Database connection error**
- Solution: Verify Supabase credentials in `backend/.env`
- Check Supabase project status at https://app.supabase.com

## Testing the Connection

### Manual Test Script

Create a test file `test_connection.js`:

```javascript
// Test backend connection
fetch('http://localhost:8000/api/health')
  .then(r => r.json())
  .then(data => console.log('Backend health:', data))
  .catch(err => console.error('Backend error:', err));

// Test through Vite proxy (from frontend)
fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('Proxy health:', data))
  .catch(err => console.error('Proxy error:', err));
```

### Expected Test Results

✅ **Backend Health Check:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

✅ **Registration Test:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User",
    "full_name": "Test User",
    "user_type": "buyer"
  },
  "token": "eyJ..."
}
```

## Next Steps

1. ✅ Backend is configured and ready
2. ✅ Frontend is configured and ready
3. ⏭️ Start both services
4. ⏭️ Test registration/login flow
5. ⏭️ Verify data persistence in Supabase

## Quick Start Commands

```bash
# Terminal 1: Start Backend
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start Frontend
npm run dev
```

Then open http://localhost:8080 in your browser!

