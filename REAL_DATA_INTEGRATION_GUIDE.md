# Real Data Integration Guide

## Overview
This guide shows which services should use **real APIs** vs **mock data** in your AgriNexus project.

## ✅ Real APIs (Production Ready)

### 1. Weather Service - REAL API INTEGRATION
**File**: `src/services/weather.ts` (Already Real!)
- **API**: OpenWeatherMap API
- **Features**: 
  - Real weather data by location
  - 5-day forecasts
  - Geolocation detection
  - Agricultural recommendations
- **Setup**: Add to `.env`:
```bash
VITE_WEATHER_API_KEY=your_openweathermap_api_key
```

### 2. Payment Service - REAL API INTEGRATION  
**File**: `src/services/payments-simple.ts` (Real Ready!)
- **API**: IntaSend Payment Gateway
- **Features**:
  - Real M-PESA, Card, Bank Transfer
  - CORS handling built-in
  - Production-ready error handling
- **Setup**: Add to `.env`:
```bash
VITE_INTASEND_PUBLIC_KEY=ISPublicKey_live_your_key
VITE_INTASEND_SECRET_KEY=ISSecretKey_live_your_secret
```

### 3. User Authentication - REAL DATABASE
**File**: Supabase Auth (Built-in)
- **Service**: Supabase Authentication
- **Features**:
  - Real user registration/login
  - User profile management
  - Session management
- **Status**: Already integrated with Supabase

## ⚠️ Mock Data (Needs Real API Integration)

### 1. Products Service - CURRENTLY MOCK DATA
**File**: `src/services/products.ts` (Uses localStorage mock data)
- **Current**: Mock products in localStorage
- **Real Data Needed**: Supabase Database

**Solution - Connect to Supabase Database:**

Replace mock functions with real Supabase calls:

```typescript
// Replace the current getProducts function
export const getProducts = async (params?: Record<string, any>): Promise<Product[]> => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    let query = supabase.from('products').select('*, users!farmer_id(username)');
    
    // Apply filters
    if (params?.category) {
      query = query.eq('category', params.category);
    }
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }
    if (params?.organic === 'true') {
      query = query.eq('is_organic', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Replace createProduct function
export const createProduct = async (payload: Partial<Product>): Promise<Product> => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const user = JSON.parse(localStorage.getItem('agronexus_user') || '{}');
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...payload,
        farmer_id: user.id,
        farmer_name: user.username,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};
```

### 2. Cart Service - LOCAL STORAGE (Should stay local for now)
**File**: `src/services/cart.ts`
- **Current**: localStorage-based cart
- **Recommendation**: Keep localStorage for cart (standard practice)
- **Optional**: Could sync with Supabase cart_items table

### 3. Orders Service - LOCAL STORAGE (Should connect to database)
**File**: `src/services/orders.ts`
- **Current**: localStorage-based orders
- **Real Data Needed**: Supabase Database

**Solution - Connect Orders to Supabase:**

```typescript
// Replace with real Supabase orders table
export const createOrder = async (orderData: any): Promise<any> => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const user = JSON.parse(localStorage.getItem('agronexus_user') || '{}');
    
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
        total_amount: orderData.totalAmount,
        status: 'pending',
        payment_status: 'pending',
        shipping_address: orderData.shippingAddress,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Create order items
    const orderItems = orderData.cartItems.map((item: any) => ({
      order_id: data.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product.price,
    }));
    
    await supabase.from('order_items').insert(orderItems);
    
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};
```

## 📍 Location Services - REAL APIs

### 1. Browser Geolocation API
**Already Built-in**: `navigator.geolocation`
- **Usage**: Real GPS coordinates
- **In Weather Service**: Already using it
- **Accuracy**: High (GPS/WiFi/Cell tower)

### 2. Reverse Geocoding (Optional)
**For Address Display**:
```typescript
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}`
    );
    const data = await response.json();
    return data.results[0]?.formatted || 'Location unknown';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Location unknown';
  }
};
```

## 🔧 Quick Setup Steps

### 1. Set Up Real Database Schema
```sql
-- Run in Supabase SQL Editor
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT,
  farmer_id UUID REFERENCES auth.users(id),
  farmer_name TEXT,
  available_quantity INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_organic BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  shipping_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Environment Variables
Add to `.env`:
```bash
# Real APIs (Production Ready)
VITE_WEATHER_API_KEY=your_openweathermap_key
VITE_INTASEND_PUBLIC_KEY=your_intasend_public_key
VITE_INTASEND_SECRET_KEY=your_intasend_secret_key

# Database (Already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Location services
VITE_OPENCAGE_API_KEY=your_opencage_key
```

### 3. Test Real API Integration
```bash
# Test weather service
npm run dev
# Check browser console for real weather data

# Test payment service
# Set real IntaSend credentials and test payments

# Test products service
# Connect to Supabase and verify real product CRUD
```

## 🎯 Priority Order for Real API Integration

1. **High Priority** (Immediate Impact):
   - Weather Service ✅ (Already Real)
   - Payment Service ✅ (Already Real)
   - Products Service → Connect to Supabase

2. **Medium Priority** (Good to Have):
   - Orders Service → Connect to Supabase
   - User Profiles → Supabase Database

3. **Low Priority** (Nice to Have):
   - Cart Sync → Optional Supabase sync
   - Location Services → Optional geocoding
   - Analytics → Optional external APIs

## 🚀 Ready-to-Use Services

**Files that are production-ready with real APIs:**
- ✅ `src/services/weather.ts` - Real weather data
- ✅ `src/services/payments-simple.ts` - Real payment processing  
- ✅ Supabase Auth - Real user authentication
- ⚠️ `src/services/products.ts` - Needs database connection
- ⚠️ `src/services/orders.ts` - Needs database connection

Your project already has **real API integration** for weather and payments! The main missing piece is connecting products and orders to your Supabase database.
