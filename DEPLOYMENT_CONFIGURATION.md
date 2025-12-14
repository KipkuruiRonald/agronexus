# Deployment Configuration Analysis & Solutions

## Problem Summary
The AgroNexus project was designed to work deployed (production environment), which causes backend connection issues in local development.

## Root Cause Analysis

### 1. **API Configuration Logic** (`src/services/api.ts`)
```typescript
const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : window.location.origin);
```

**Issue**: 
- **Development**: API_BASE = '' (empty), uses relative `/api` which gets proxied to `localhost:8000`
- **Production**: API_BASE = `window.location.origin` (same domain as frontend)

### 2. **Vite Proxy Limitation** (`vite.config.ts`)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    secure: false,
  },
}
```

**Issue**: This proxy only works when:
- Running `npm run dev` (development mode)
- On the default Vite port (5173) or configured port (8080)

### 3. **Production-First Design**
The project assumes frontend and backend will be deployed on the same domain, making the API calls relative to the current origin.

## Solutions Implemented

### 1. **Environment Configuration Files**

#### `.env.development` (for local development)
```env
VITE_API_BASE=http://localhost:8000
VITE_FRONTEND_BASE=http://localhost:8080
```

#### `.env.production` (for deployment)
```env
VITE_API_BASE=  # Leave empty to use same domain as frontend
VITE_FRONTEND_BASE=  # Set to your actual frontend URL
```

#### `backend/.env.template` (backend configuration)
```env
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_KEY=your_supabase_anon_key_here
SECRET_KEY=your-secret-jwt-key-change-in-production
ALGORITHM=HS256
PASSWORD_SALT=agronexus-salt-2024-change-in-production
```

### 2. **How the Fix Works**

#### Development Mode (`npm run dev`)
1. Vite loads `.env.development` automatically
2. `VITE_API_BASE=http://localhost:8000` is set
3. API calls go directly to `http://localhost:8000/api`
4. Vite proxy is no longer needed but doesn't interfere

#### Production Mode (`npm run build`)
1. If `VITE_API_BASE` is empty, falls back to `window.location.origin`
2. API calls go to the same domain as the frontend
3. Backend must be deployed on the same domain or CORS must be configured

### 3. **Backend Configuration**
The backend requires Supabase environment variables to start:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `SECRET_KEY`: JWT secret for authentication
- `PASSWORD_SALT`: Salt for password hashing

## Usage Instructions

### For Local Development
1. **Set up backend environment**:
   ```bash
   cd backend
   cp .env.template .env
   # Edit .env with your Supabase credentials
   ```

2. **Start the services**:
   ```bash
   # Using the provided script
   start-agronexus.bat
   
   # Or manually
   # Terminal 1: Backend
   cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000
   
   # Terminal 2: Frontend  
   npm run dev
   ```

### For Production Deployment
1. **Deploy both services to the same domain**:
   - Frontend: `https://yourdomain.com`
   - Backend: `https://yourdomain.com/api` (via reverse proxy)

2. **Or configure separate domains**:
   - Set `VITE_API_BASE=https://api.yourdomain.com` in production environment
   - Configure CORS on backend to accept your frontend domain

## Key Benefits of This Solution

1. **Development-Friendly**: Easy local setup with proper API configuration
2. **Production-Ready**: Maintains the original deployment-first design
3. **Environment-Aware**: Different configurations for dev vs prod
4. **No Code Changes**: Uses Vite's built-in environment variable system
5. **Backward Compatible**: Existing deployment setup continues to work

## Testing the Fix

1. **Start backend**: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000`
2. **Start frontend**: `npm run dev`
3. **Open browser**: `http://localhost:8080`
4. **Test API calls**: Should connect to `http://localhost:8000/api`

The warning message in the browser console about missing `VITE_API_BASE` in production should disappear when the environment files are properly configured.
