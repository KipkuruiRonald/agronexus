from fastapi import FastAPI, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
import jwt
import hashlib
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="AgroNexus Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
PASSWORD_SALT = os.getenv("PASSWORD_SALT", "agronexus-salt-2024-change-in-production")

# Validate required environment variables
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_KEY are required.\n"
        "Please create a backend/.env file with your Supabase credentials.\n"
        "See backend/.env.example for a template."
    )

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    raise ValueError(
        f"Failed to initialize Supabase client: {str(e)}\n"
        "Please verify your SUPABASE_URL and SUPABASE_KEY in backend/.env"
    ) from e

# ================== PYDANTIC MODELS ==================
class UserLogin(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    user_type: str = "buyer"
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    farm_name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image_url: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    farm_name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image_url: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    description: Optional[str] = None
    quantity: int = 0
    unit: Optional[str] = "kg"
    images: Optional[List[str]] = None
    status: str = "active"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    images: Optional[List[str]] = None
    status: Optional[str] = None

class OrderCreate(BaseModel):
    farmer_id: str
    total_amount: float
    shipping_address: Optional[Dict[str, Any]] = None
    delivery_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    phone_number: Optional[str] = None
    payment_info: Optional[Dict[str, Any]] = None
    items: List[Dict[str, Any]]

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    shipping_address: Optional[Dict[str, Any]] = None
    delivery_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    phone_number: Optional[str] = None
    payment_info: Optional[Dict[str, Any]] = None

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None
    status: str = "pending"

class CheckoutData(BaseModel):
    delivery_address: str
    delivery_notes: Optional[str] = None
    phone_number: str

# ================== AUTHENTICATION ==================
security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return get_password_hash(plain_password) == hashed_password
    except:
        return False

def get_password_hash(password: str) -> str:
    password_with_salt = password + PASSWORD_SALT + SECRET_KEY
    return hashlib.sha256(password_with_salt.encode()).hexdigest()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        response = supabase.table('users').select('*').eq('id', user_id).execute()
        if not response.data:
            raise HTTPException(status_code=401, detail="User not found")
        
        return response.data[0]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

# ================== ROOT & HEALTH ENDPOINTS ==================
@app.get("/")
async def root():
    return {"message": "AgroNexus API", "version": "1.0.0", "status": "active"}

@app.get("/api/health")
async def health_check():
    try:
        test_query = supabase.table('users').select('id').limit(1).execute()
        db_status = "connected" if test_query.data is not None else "disconnected"
        
        return {
            "status": "healthy", 
            "database": db_status,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "connection_error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# ================== AUTH ENDPOINTS ==================
@app.post("/api/auth/register", response_model=Dict[str, Any])
async def register_user(user_data: UserCreate):
    try:
        existing = supabase.table('users').select('email').eq('email', user_data.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        existing_username = supabase.table('users').select('username').eq('username', user_data.username).execute()
        if existing_username.data:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        user_obj = {
            "id": str(uuid.uuid4()),
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": get_password_hash(user_data.password),
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "farm_name": user_data.farm_name if user_data.user_type == "farmer" else None,
            "location": user_data.location if user_data.user_type == "farmer" else None,
            "user_type": user_data.user_type,
            "phone": user_data.phone,
            "address": user_data.address,
            "profile_image_url": user_data.profile_image_url,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('users').insert(user_obj).execute()
        
        if result.data:
            user = result.data[0]
            token = create_access_token({"sub": user['id'], "email": user['email'], "user_type": user['user_type']})
            
            if 'password_hash' in user:
                del user['password_hash']
            
            # Add full_name for frontend compatibility
            if user.get('first_name') or user.get('last_name'):
                user['full_name'] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            else:
                user['full_name'] = user.get('username', user.get('email', 'User'))
            
            return {
                "message": "Registration successful",
                "user": user,
                "token": token
            }
        raise HTTPException(status_code=500, detail="Registration failed")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")
    
@app.post("/api/auth/login", response_model=Dict[str, Any])
async def login_user(login_data: UserLogin):
    try:
        response = supabase.table('users').select('*').eq('email', login_data.email).execute()
        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = response.data[0]
        
        if 'password_hash' not in user:
            hashed_password = get_password_hash(login_data.password)
            supabase.table('users').update({"password_hash": hashed_password}).eq('id', user['id']).execute()
            user['password_hash'] = hashed_password
        
        if not verify_password(login_data.password, user.get('password_hash', '')):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        token = create_access_token({"sub": user['id'], "email": user['email'], "user_type": user['user_type']})
        
        if 'password_hash' in user:
            del user['password_hash']
        
        # Add full_name for frontend compatibility
        if user.get('first_name') or user.get('last_name'):
            user['full_name'] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        else:
            user['full_name'] = user.get('username', user.get('email', 'User'))
        
        return {
            "message": "Login successful",
            "user": user,
            "token": token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.get("/api/auth/me", response_model=Dict[str, Any])
async def get_current_user_profile(current_user: Dict = Depends(get_current_user)):
    if 'password_hash' in current_user:
        del current_user['password_hash']
    
    # Add full_name for frontend compatibility
    if current_user.get('first_name') or current_user.get('last_name'):
        current_user['full_name'] = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
    else:
        current_user['full_name'] = current_user.get('username', current_user.get('email', 'User'))
    
    return {"user": current_user}

@app.post("/api/auth/logout")
async def logout_user():
    return {"message": "Logout successful"}

# ================== USER MANAGEMENT ==================
@app.get("/api/users/{user_id}", response_model=Dict[str, Any])
async def get_user_profile(user_id: str):
    try:
        response = supabase.table('users').select('*').eq('id', user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = response.data[0]
        if 'password_hash' in user:
            del user['password_hash']
        
        # Add full_name for frontend compatibility
        if user.get('first_name') or user.get('last_name'):
            user['full_name'] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        else:
            user['full_name'] = user.get('username', user.get('email', 'User'))
        
        return {"user": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/users/{user_id}", response_model=Dict[str, Any])
async def update_user_profile(
    user_id: str, 
    update_data: UserUpdate, 
    current_user: Dict = Depends(get_current_user)
):
    try:
        if current_user['id'] != user_id and current_user.get('user_type') != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_dict = update_data.dict(exclude_unset=True)
        update_dict['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table('users').update(update_dict).eq('id', user_id).execute()
        
        if result.data:
            user = result.data[0]
            if 'password_hash' in user:
                del user['password_hash']
            
            # Add full_name for frontend compatibility
            if user.get('first_name') or user.get('last_name'):
                user['full_name'] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            else:
                user['full_name'] = user.get('username', user.get('email', 'User'))
            
            return {"message": "Profile updated successfully", "user": user}
        raise HTTPException(status_code=500, detail="Update failed")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== PRODUCTS MANAGEMENT ==================
@app.get("/api/products", response_model=Dict[str, Any])
async def get_products(
    category: Optional[str] = Query(None),
    farmer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    try:
        query = supabase.table('products').select('*, users(full_name, profile_image_url, farm_name, location)')
        
        if category:
            query = query.eq('category', category)
        if farmer_id:
            query = query.eq('farmer_id', farmer_id)
        if search:
            query = query.or_(f"name.ilike.%{search}%,description.ilike.%{search}%")
        
        start = (page - 1) * limit
        query = query.range(start, start + limit - 1)
        
        products_response = query.execute()
        products = products_response.data
        
        count_query = supabase.table('products').select('id', count='exact')
        if category:
            count_query = count_query.eq('category', category)
        if farmer_id:
            count_query = count_query.eq('farmer_id', farmer_id)
        if search:
            count_query = count_query.or_(f"name.ilike.%{search}%,description.ilike.%{search}%")
        
        count_response = count_query.execute()
        total = count_response.count or 0
        
        return {
            "products": products,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}", response_model=Dict[str, Any])
async def get_product(product_id: str):
    try:
        response = supabase.table('products').select('*, users(full_name, profile_image_url, farm_name, location)').eq('id', product_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"product": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products", response_model=Dict[str, Any])
async def create_product(
    product_data: ProductCreate,
    current_user: Dict = Depends(get_current_user)
):
    try:
        if current_user.get('user_type') != 'farmer':
            raise HTTPException(status_code=403, detail="Only farmers can create products")
        
        product_obj = {
            "id": str(uuid.uuid4()),
            "name": product_data.name,
            "category": product_data.category,
            "price": product_data.price,
            "description": product_data.description,
            "quantity": product_data.quantity,
            "unit": product_data.unit,
            "farmer_id": current_user['id'],
            "images": product_data.images or [],
            "status": product_data.status,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('products').insert(product_obj).execute()
        
        if result.data:
            return {
                "message": "Product created successfully",
                "product": result.data[0]
            }
        raise HTTPException(status_code=500, detail="Product creation failed")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/products/{product_id}", response_model=Dict[str, Any])
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: Dict = Depends(get_current_user)
):
    try:
        response = supabase.table('products').select('*').eq('id', product_id).eq('farmer_id', current_user['id']).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found or unauthorized")
        
        update_obj = product_data.dict(exclude_unset=True)
        update_obj['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table('products').update(update_obj).eq('id', product_id).execute()
        
        if result.data:
            return {
                "message": "Product updated successfully",
                "product": result.data[0]
            }
        raise HTTPException(status_code=500, detail="Product update failed")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        response = supabase.table('products').select('*').eq('id', product_id).eq('farmer_id', current_user['id']).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found or unauthorized")
        
        supabase.table('products').delete().eq('id', product_id).execute()
        
        return {"message": "Product deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/categories")
async def get_categories():
    try:
        response = supabase.table('products').select('category').execute()
        categories = list(set([item['category'] for item in response.data if item.get('category')]))
        return {"categories": sorted(categories)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== ORDERS MANAGEMENT ==================
@app.get("/api/orders", response_model=Dict[str, Any])
async def get_orders(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict = Depends(get_current_user)
):
    try:
        query = supabase.table('orders').select('*, order_items(*, products(*)), users!orders_buyer_id_fkey(*)')
        
        if status:
            query = query.eq('status', status)
        
        if current_user.get('user_type') == 'farmer':
            query = query.eq('farmer_id', current_user['id'])
        elif current_user.get('user_type') == 'buyer':
            query = query.eq('buyer_id', current_user['id'])
        
        start = (page - 1) * limit
        query = query.order('created_at', desc=True).range(start, start + limit - 1)
        
        response = query.execute()
        
        return {
            "orders": response.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(response.data)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}", response_model=Dict[str, Any])
async def get_order(order_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        response = supabase.table('orders')\
            .select('*, order_items(*, products(*)), users!orders_buyer_id_fkey(*), users!orders_farmer_id_fkey(*)')\
            .eq('id', order_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = response.data[0]
        
        if (current_user['id'] not in [order['buyer_id'], order['farmer_id']] and 
            current_user.get('user_type') != 'admin'):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {"order": order}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/orders", response_model=Dict[str, Any])
async def create_order(
    order_data: OrderCreate,
    current_user: Dict = Depends(get_current_user)
):
    try:
        order_id = str(uuid.uuid4())
        order_items = []
        
        order_obj = {
            "id": order_id,
            "buyer_id": current_user['id'],
            "farmer_id": order_data.farmer_id,
            "total_amount": order_data.total_amount,
            "status": "pending",
            "shipping_address": order_data.shipping_address,
            "delivery_address": order_data.delivery_address,
            "delivery_notes": order_data.delivery_notes,
            "phone_number": order_data.phone_number,
            "payment_info": order_data.payment_info,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        order_result = supabase.table('orders').insert(order_obj).execute()
        
        if not order_result.data:
            raise HTTPException(status_code=500, detail="Order creation failed")
        
        for item in order_data.items:
            item_id = str(uuid.uuid4())
            item_obj = {
                "id": item_id,
                "order_id": order_id,
                "product_id": item['product_id'],
                "quantity": item['quantity'],
                "price": item['price']
            }
            order_items.append(item_obj)
            
            supabase.table('products')\
                .update({"quantity": supabase.table('products').select('quantity').eq('id', item['product_id']).execute().data[0]['quantity'] - item['quantity']})\
                .eq('id', item['product_id'])\
                .execute()
        
        if order_items:
            supabase.table('order_items').insert(order_items).execute()
        
        return {
            "message": "Order created successfully",
            "order": order_result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/orders/checkout", response_model=Dict[str, Any])
async def checkout_order(
    checkout_data: CheckoutData,
    cart_id: str = Query(...),
    current_user: Dict = Depends(get_current_user)
):
    try:
        cart_response = supabase.table('carts').select('*, cart_items(*, products(*))').eq('id', cart_id).eq('user_id', current_user['id']).execute()
        if not cart_response.data:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        cart = cart_response.data[0]
        if not cart.get('cart_items'):
            raise HTTPException(status_code=400, detail="Cart is empty")
        
        farmer_orders = {}
        for item in cart['cart_items']:
            product = item['products']
            farmer_id = product['farmer_id']
            
            if farmer_id not in farmer_orders:
                farmer_orders[farmer_id] = {
                    "items": [],
                    "total_amount": 0
                }
            
            farmer_orders[farmer_id]["items"].append({
                "product_id": product['id'],
                "quantity": item['quantity'],
                "price": product['price']
            })
            farmer_orders[farmer_id]["total_amount"] += product['price'] * item['quantity']
        
        created_orders = []
        for farmer_id, order_data in farmer_orders.items():
            order_id = str(uuid.uuid4())
            order_obj = {
                "id": order_id,
                "buyer_id": current_user['id'],
                "farmer_id": farmer_id,
                "total_amount": order_data["total_amount"],
                "status": "pending",
                "delivery_address": checkout_data.delivery_address,
                "delivery_notes": checkout_data.delivery_notes,
                "phone_number": checkout_data.phone_number,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            order_result = supabase.table('orders').insert(order_obj).execute()
            
            order_items = []
            for item in order_data["items"]:
                item_id = str(uuid.uuid4())
                item_obj = {
                    "id": item_id,
                    "order_id": order_id,
                    "product_id": item['product_id'],
                    "quantity": item['quantity'],
                    "price": item['price']
                }
                order_items.append(item_obj)
                
                supabase.table('products')\
                    .update({"quantity": supabase.table('products').select('quantity').eq('id', item['product_id']).execute().data[0]['quantity'] - item['quantity']})\
                    .eq('id', item['product_id'])\
                    .execute()
            
            if order_items:
                supabase.table('order_items').insert(order_items).execute()
            
            created_orders.append(order_result.data[0])
        
        supabase.table('cart_items').delete().eq('cart_id', cart_id).execute()
        supabase.table('carts').update({"total": 0, "updated_at": datetime.utcnow().isoformat()}).eq('id', cart_id).execute()
        
        return {
            "message": "Checkout successful",
            "orders": created_orders
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/orders/{order_id}", response_model=Dict[str, Any])
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    current_user: Dict = Depends(get_current_user)
):
    try:
        response = supabase.table('orders').select('*').eq('id', order_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = response.data[0]
        
        if (current_user['id'] not in [order['buyer_id'], order['farmer_id']] and 
            current_user.get('user_type') != 'admin'):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_obj = order_data.dict(exclude_unset=True)
        update_obj['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table('orders').update(update_obj).eq('id', order_id).execute()
        
        if result.data:
            return {
                "message": "Order updated successfully",
                "order": result.data[0]
            }
        raise HTTPException(status_code=500, detail="Order update failed")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== CART MANAGEMENT ==================
@app.get("/api/cart", response_model=Dict[str, Any])
async def get_cart(current_user: Dict = Depends(get_current_user)):
    try:
        cart_response = supabase.table('carts').select('*, cart_items(*, products(*, users(full_name, farm_name)))').eq('user_id', current_user['id']).execute()
        
        if cart_response.data:
            return {"cart": cart_response.data[0]}
        
        cart_obj = {
            "id": str(uuid.uuid4()),
            "user_id": current_user['id'],
            "total": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('carts').insert(cart_obj).execute()
        
        return {"cart": result.data[0]} if result.data else {"cart": None}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cart/items", response_model=Dict[str, Any])
async def add_to_cart(
    cart_item: CartItemAdd,
    current_user: Dict = Depends(get_current_user)
):
    try:
        cart_response = supabase.table('carts').select('*').eq('user_id', current_user['id']).execute()
        
        if not cart_response.data:
            cart_id = str(uuid.uuid4())
            cart_obj = {
                "id": cart_id,
                "user_id": current_user['id'],
                "total": 0,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            supabase.table('carts').insert(cart_obj).execute()
        else:
            cart_id = cart_response.data[0]['id']
        
        product_response = supabase.table('products').select('price').eq('id', cart_item.product_id).execute()
        if not product_response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product_price = product_response.data[0]['price']
        
        item_obj = {
            "id": str(uuid.uuid4()),
            "cart_id": cart_id,
            "product_id": cart_item.product_id,
            "quantity": cart_item.quantity,
            "price": product_price
        }
        
        supabase.table('cart_items').upsert(item_obj, on_conflict='cart_id,product_id').execute()
        
        cart_items = supabase.table('cart_items').select('*').eq('cart_id', cart_id).execute()
        total = sum(item['price'] * item['quantity'] for item in cart_items.data)
        
        supabase.table('carts').update({"total": total, "updated_at": datetime.utcnow().isoformat()}).eq('id', cart_id).execute()
        
        return {"message": "Item added to cart successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cart/items/{product_id}")
async def remove_from_cart(product_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        cart_response = supabase.table('carts').select('*').eq('user_id', current_user['id']).execute()
        if not cart_response.data:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        cart_id = cart_response.data[0]['id']
        
        supabase.table('cart_items').delete().eq('cart_id', cart_id).eq('product_id', product_id).execute()
        
        cart_items = supabase.table('cart_items').select('*').eq('cart_id', cart_id).execute()
        total = sum(item['price'] * item['quantity'] for item in cart_items.data)
        
        supabase.table('carts').update({"total": total, "updated_at": datetime.utcnow().isoformat()}).eq('id', cart_id).execute()
        
        return {"message": "Item removed from cart successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cart")
async def clear_cart(current_user: Dict = Depends(get_current_user)):
    try:
        cart_response = supabase.table('carts').select('*').eq('user_id', current_user['id']).execute()
        if not cart_response.data:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        cart_id = cart_response.data[0]['id']
        
        supabase.table('cart_items').delete().eq('cart_id', cart_id).execute()
        
        supabase.table('carts').update({"total": 0, "updated_at": datetime.utcnow().isoformat()}).eq('id', cart_id).execute()
        
        return {"message": "Cart cleared successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== DASHBOARD & ANALYTICS ==================
@app.get("/api/dashboard/stats", response_model=Dict[str, Any])
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    try:
        user_id = current_user['id']
        user_type = current_user.get('user_type', 'buyer')
        
        stats = {}
        
        if user_type == 'farmer':
            products_count = supabase.table('products').select('id', count='exact').eq('farmer_id', user_id).execute().count or 0
            orders_count = supabase.table('orders').select('id', count='exact').eq('farmer_id', user_id).execute().count or 0
            total_revenue_result = supabase.table('orders').select('total_amount').eq('farmer_id', user_id).eq('status', 'completed').execute()
            total_revenue = sum(order['total_amount'] for order in total_revenue_result.data) if total_revenue_result.data else 0
            pending_orders = supabase.table('orders').select('id', count='exact').eq('farmer_id', user_id).eq('status', 'pending').execute().count or 0
            
            stats = {
                "products_count": products_count,
                "orders_count": orders_count,
                "total_revenue": total_revenue,
                "pending_orders": pending_orders,
                "user_type": "farmer"
            }
        else:
            orders_count = supabase.table('orders').select('id', count='exact').eq('buyer_id', user_id).execute().count or 0
            cart_items_count = supabase.table('cart_items').select('id', count='exact').eq('cart_id', supabase.table('carts').select('id').eq('user_id', user_id).execute().data[0]['id'] if supabase.table('carts').select('id').eq('user_id', user_id).execute().data else None).execute().count or 0
            
            stats = {
                "orders_count": orders_count,
                "cart_items_count": cart_items_count,
                "user_type": "buyer"
            }
        
        return {"stats": stats}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== ADMIN ENDPOINTS ==================
@app.get("/api/admin/users", response_model=Dict[str, Any])
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict = Depends(get_current_user)
):
    try:
        if current_user.get('user_type') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        start = (page - 1) * limit
        response = supabase.table('users').select('*').range(start, start + limit - 1).execute()
        
        users = response.data
        for user in users:
            if 'password_hash' in user:
                del user['password_hash']
        
        total = supabase.table('users').select('id', count='exact').execute().count or 0
        
        return {
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/stats")
async def get_admin_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    try:
        if current_user.get('user_type') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        total_users = supabase.table('users').select('id', count='exact').execute().count or 0
        total_products = supabase.table('products').select('id', count='exact').execute().count or 0
        total_orders = supabase.table('orders').select('id', count='exact').execute().count or 0
        total_revenue_result = supabase.table('orders').select('total_amount').eq('status', 'completed').execute()
        total_revenue = sum(order['total_amount'] for order in total_revenue_result.data) if total_revenue_result.data else 0
        
        return {
            "total_users": total_users,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "active_farmers": supabase.table('users').select('id', count='exact').eq('user_type', 'farmer').execute().count or 0,
            "active_buyers": supabase.table('users').select('id', count='exact').eq('user_type', 'buyer').execute().count or 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)