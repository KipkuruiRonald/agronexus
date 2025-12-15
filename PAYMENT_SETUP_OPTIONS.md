# Payment System Setup Options

## Option 1: Simple Client-Side Payments (Recommended for Development)

**Use the file: `src/services/payments-simple.ts`**

This is the easiest option that doesn't require any server setup:

1. **No Edge Functions Required** - Works entirely in the browser
2. **No Deno Installation Needed** - Uses fetch() API directly
3. **CORS Handling** - Includes fallback simulation mode
4. **Real API Integration** - Can work with actual IntaSend when credentials are provided

### Setup:
```bash
# Add your IntaSend credentials to .env.local
VITE_INTASEND_PUBLISHABLE_KEY=your_key_here
VITE_INTASEND_SECRET_KEY=your_secret_here
```

### Usage:
```javascript
import { initiatePaymentFromCart } from './services/payments-simple';

// In your component
const handlePayment = async () => {
  const result = await initiatePaymentFromCart('MPESA', '0712345678', 'user@example.com');
  console.log(result.checkout_url);
};
```

---

## Option 2: Supabase Edge Functions (For Production)

**Requires Deno installation for deployment**

If you want to use Edge Functions for better CORS handling:

### Install Deno:
```bash
# Windows
winget install deno

# Or using npm
npm install -g deno
```

### Deploy Edge Function:
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy intasend-payment-proxy
```

---

## Option 3: External API Gateway (Production Alternative)

Create a simple Node.js/Express server to proxy requests:

### server.js:
```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/payment', async (req, res) => {
  // Proxy to IntaSend API
  const response = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTASEND_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  res.json(data);
});

app.listen(3001);
```

---

## Recommendation

**For development and testing:** Use Option 1 (client-side payments)
**For production:** Use Option 3 (external API gateway)

The client-side approach with `payments-simple.ts` is the most straightforward and doesn't require any additional infrastructure setup.
