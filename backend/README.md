# AgroNexus Backend

FastAPI backend service for AgroNexus platform.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Supabase account and project

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or use the setup script:

**Windows (PowerShell):**
```powershell
.\setup_backend.ps1
```

**Linux/Mac:**
```bash
chmod +x setup_backend.sh
./setup_backend.sh
```

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-key-here
   SECRET_KEY=your-secret-jwt-key-change-in-production
   ```

   **Getting Supabase Credentials:**
   - Go to https://app.supabase.com
   - Select your project (or create a new one)
   - Go to Settings → API
   - Copy the "Project URL" → `SUPABASE_URL`
   - Copy the "anon public" key → `SUPABASE_KEY`

### 3. Set Up Database Schema

Run the SQL script in your Supabase SQL Editor:
```bash
# Copy the contents of supabase_setup.sql from the project root
# Paste and execute in Supabase SQL Editor
```

Or use the Supabase CLI:
```bash
supabase db push
```

### 4. Start the Backend Server

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health
- Root: http://localhost:8000/

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_KEY` | Yes | Your Supabase anon/public key |
| `SECRET_KEY` | Yes* | JWT secret key for authentication |
| `ALGORITHM` | No | JWT algorithm (default: HS256) |
| `PASSWORD_SALT` | No | Salt for password hashing |

*Required for production, has a default for development

## API Endpoints

### Health Check
- `GET /api/health` - Check backend and database status

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Products
- `GET /api/products` - List products
- `GET /api/products/{id}` - Get product details
- `POST /api/products` - Create product (farmer only)
- `PUT /api/products/{id}` - Update product (farmer only)
- `DELETE /api/products/{id}` - Delete product (farmer only)

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/{id}` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}` - Update order

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/items` - Add item to cart
- `DELETE /api/cart/items/{id}` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Troubleshooting

### Backend won't start

1. **Check environment variables:**
   ```bash
   # Verify .env file exists and has required variables
   cat .env
   ```

2. **Check Supabase connection:**
   ```bash
   # Test the health endpoint
   curl http://localhost:8000/api/health
   ```

3. **Check dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Database connection errors

- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check that your Supabase project is active
- Ensure the database schema is set up (run `supabase_setup.sql`)

### Port already in use

If port 8000 is already in use:
```bash
# Use a different port
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Then update your frontend `.env.development`:
```env
VITE_API_BASE=http://localhost:8001
```

## Development

### Running with auto-reload

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing

```bash
# Test backend connectivity
python ../test_backend_connectivity.py
```

## Production Deployment

1. Set strong values for `SECRET_KEY` and `PASSWORD_SALT`
2. Use environment variables from your hosting provider
3. Configure CORS for your production domain
4. Set up proper database backups
5. Enable SSL/TLS

## License

See LICENSE file in project root.


