# Real IntaSend Payment Integration Setup

This document provides setup instructions for real IntaSend payments with CORS bypass and Supabase user integration.

## 🎯 **Key Fixes Applied:**

### **1. CORS Solution - Supabase Edge Function Proxy**
- **Problem**: IntaSend API blocks CORS from localhost
- **Solution**: Created Edge Function proxy at `/supabase/functions/intasend-payment-proxy/index.ts`
- **Result**: All IntaSend requests now go through the proxy, bypassing CORS restrictions

### **2. Real Supabase User Data Integration**
- **Problem**: Payment system using separate first/last name inputs instead of Supabase user data
- **Solution**: Updated `getPaymentDataFromDatabase()` to use real Supabase user data
- **Result**: Payments now use actual user profile information from Supabase

### **3. Production-Ready Payment Flow**
- **Edge Function**: Handles real IntaSend API calls with proper authentication
- **Database Integration**: User payments tracked in Supabase
- **Error Handling**: Comprehensive error handling for production use

## 🚀 **Deployment Steps:**

### **1. Deploy Edge Function**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Deploy the Edge Function
supabase functions deploy intasend-payment-proxy
```

### **2. Configure Environment Variables**
Set these in your Supabase project settings:

```bash
# In Supabase Dashboard > Settings > Environment Variables
INTASEND_PUBLIC_KEY=ISPublicKey_live_your_real_key
INTASEND_SECRET_KEY=ISSecretKey_live_your_real_secret
```

### **3. Set Frontend Environment Variables**
Create/update your `.env` file:

```bash
# Frontend environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_INTASEND_PUBLIC_KEY=ISPublicKey_live_your_real_key
```

### **4. Update Your Payments Service**
Replace your current payments service with the fixed version:
- The fixed service is in `src/services/payments-fixed.ts`
- Copy it over your existing `src/services/payments.ts`

### **5. Create Payments Table (Optional)**
For payment tracking in Supabase:

```sql
-- Run in Supabase SQL Editor
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  method TEXT DEFAULT 'M-PESA',
  status TEXT DEFAULT 'pending',
  customer_phone TEXT,
  customer_email TEXT,
  customer_name TEXT,
  description TEXT,
  order_id TEXT,
  intasend_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert payments" ON payments
    FOR INSERT WITH CHECK (true);
```

## 🔧 **How It Works:**

### **Payment Flow:**
1. **Frontend**: User initiates payment from cart/checkout
2. **Service**: `getPaymentDataFromDatabase()` fetches Supabase user + cart data
3. **Edge Function**: Frontend calls Edge Function proxy (bypasses CORS)
4. **IntaSend API**: Edge Function makes real API call to IntaSend
5. **Database**: Payment record stored in Supabase (optional)
6. **Response**: Payment details returned to frontend

### **CORS Bypass:**
```
Browser → Supabase Edge Function → IntaSend API
         (No CORS issues)    (Server-side)
```

### **User Data Integration:**
- **Email**: From Supabase auth user profile
- **Name**: From `full_name` or `first_name + last_name` in Supabase user table
- **Phone**: From user profile phone field
- **Cart**: From localStorage cart with product data

## 🧪 **Testing:**

### **1. Test Edge Function Locally**
```bash
# Start Supabase locally
supabase start

# Test Edge Function
curl -X POST http://localhost:54321/functions/v1/intasend-payment-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "check_status", "invoiceId": "test_invoice"}'
```

### **2. Test Payment Integration**
1. Set up your environment variables
2. Open browser developer tools
3. Initiate a payment from your app
4. Check console logs for successful proxy requests

### **3. Monitor in Supabase Dashboard**
- **Functions**: Check Edge Function logs
- **Database**: View payments table (if created)
- **Auth**: Monitor user authentication

## ⚠️ **Important Notes:**

### **Production Credentials**
- Use **live** IntaSend credentials (not test keys)
- Test with small amounts first
- Monitor IntaSend dashboard for transaction logs

### **Security**
- Edge Function handles API credentials securely
- No sensitive data exposed to frontend
- Proper CORS headers configured

### **Error Handling**
- Comprehensive error handling for network issues
- Fallback to simulation mode if credentials missing
- User-friendly error messages

## 🔄 **Migration from Mock to Real:**

Your existing code will continue to work:
- **Simulation mode**: Still works when no credentials configured
- **Real mode**: Activated automatically when live credentials set
- **Database tracking**: Enhanced payment tracking in production

The service automatically detects whether to use simulation or real mode based on your environment configuration.
