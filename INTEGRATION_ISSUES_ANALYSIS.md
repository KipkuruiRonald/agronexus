# UI-Backend Integration Issues Analysis

## Major Issues Identified

### 1. **Port Mismatch** ❌
- **Backend runs on:** Port 8000 (main.py: `uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)`)
- **Vite proxy configured for:** Port 4000 (vite.config.ts: `target: 'http://localhost:4000'`)
- **Frontend API service expects:** Port 8000 (api.ts: `http://localhost:8000`)

### 2. **API Endpoint Conflict** ❌
- Backend API routes: `/api/auth/login`, `/api/auth/register`, etc.
- Vite proxy: `/api` → `http://localhost:4000/api`
- Frontend service: `baseURL + "/api"` = `/api/api/auth/login` (double `/api`)

### 3. **User Object Structure Mismatch** ❌
**Frontend expects:**
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  user_type: "farmer" | "buyer";
  first_name?: string;
  last_name?: string;
  location?: string;
}
```

**Backend returns:**
```python
{
  "id": "uuid-string",
  "email": "user@example.com", 
  "full_name": "John Doe",
  "user_type": "buyer",
  "phone": "+1234567890",
  "address": "123 Main St",
  "profile_image_url": "..."
}
```

### 4. **Authentication Flow Issues** ❌
- Frontend sends `username` but backend expects `email`
- Frontend sends separate `first_name`, `last_name` but backend expects `full_name`
- Field validation fails on both sides

### 5. **Environment Configuration Missing** ❌
- No accessible .env file to verify VITE_API_BASE configuration
- Inconsistent port references in different files

## Immediate Actions Required

1. **Fix Port Configuration**
   - Align all services to use the same port (8000)
   - Update vite.config.ts proxy target
   - Ensure VITE_API_BASE_URL points to correct port

2. **Fix API Endpoint Path**
   - Backend already uses `/api/` prefix
   - Frontend should not add another `/api` when using proxy
   - Fix double `/api` issue

3. **Align User Object Schema**
   - Backend should match frontend expectations
   - Or frontend should adapt to backend structure
   - Include missing fields: `username`, `first_name`, `last_name`, `location`

4. **Fix Registration Fields**
   - Frontend sends: `username`, `first_name`, `last_name`
   - Backend expects: `full_name` instead of split names
   - Add missing fields to registration flow

## Quick Test Commands

```bash
# Test backend connectivity
curl http://localhost:8000/api/health

# Test login endpoint directly
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## Expected Behavior After Fixes
1. Frontend should successfully connect to backend
2. User registration should create users with correct fields
3. Login should return proper user object
4. Authentication state should persist correctly
5. Protected routes should work as expected
