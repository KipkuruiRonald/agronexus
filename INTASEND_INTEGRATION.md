# IntaSend Payment Integration Guide

## Overview

This guide explains how to integrate IntaSend payments into the AgriNexus application. IntaSend is a payment gateway that supports M-PESA, card payments, and bank transfers in Kenya and other African countries.

## Features

- **M-PESA Integration**: Accept payments directly from mobile money
- **Card Payments**: Support for Visa, Mastercard, and other cards
- **Bank Transfers**: Direct bank-to-bank transfers
- **Serverless Architecture**: No backend required for payment processing
- **Local Storage**: Payment data stored locally for offline capability
- **Real-time Updates**: Payment status updates via webhooks
- **Development Mode**: Simulation mode for testing without API keys

## Setup Instructions

### 1. Get IntaSend API Credentials

1. Sign up at [https://intasend.com/](https://intasend.com/)
2. Create a merchant account
3. Navigate to API Settings in your dashboard
4. Copy your **Publishable Key** and **Secret Key**
5. Start with sandbox credentials for testing

### 2. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your IntaSend credentials:
   ```env
   VITE_INTASEND_BASE_URL=https://sandbox.intasend.com/api/v1
   VITE_INTASEND_PUBLISHABLE_KEY=your_publishable_key_here
   VITE_INTASEND_SECRET_KEY=your_secret_key_here
   ```

3. For production, use:
   ```env
   VITE_INTASEND_BASE_URL=https://api.intasend.com/api/v1
   VITE_INTASEND_PUBLISHABLE_KEY=your_production_key
   VITE_INTASEND_SECRET_KEY=your_production_secret
   ```

### 3. Development vs Production

**Development Mode (No API Keys):**
- Payments are simulated locally
- No real money is processed
- Useful for testing the UI and flow
- Success rate: 80% simulated for testing

**Production Mode (With API Keys):**
- Real IntaSend API calls
- Actual payment processing
- Real money transactions
- Full webhook support

## Usage

### Basic Payment Flow

```typescript
import { initiatePayment, checkPaymentStatus } from '@/services/payments';

// 1. Initiate a payment
const payment = await initiatePayment(
  'ORDER_123',
  '254700000000',
  1000,
  'M-PESA'
);

// 2. Redirect to checkout
window.location.href = payment.checkout_url;

// 3. Check payment status
const status = await checkPaymentStatus(payment.payment_id);
```

### Advanced Usage

```typescript
import { intaSendService } from '@/services/payments';

// Get all user payments
const payments = intaSendService.getUserPayments();

// Get payment statistics
const stats = intaSendService.getPaymentStats();

// Listen for payment updates
window.addEventListener('paymentUpdate', (event) => {
  const { payment_id, status } = event.detail;
  console.log(`Payment ${payment_id} status: ${status}`);
});
```

## Payment Methods

### M-PESA
- **Required**: Phone number
- **Currency**: KES
- **Description**: Mobile money payments
- **Processing**: Instant

### Card Payments
- **Required**: Email address
- **Supported**: Visa, Mastercard
- **Currency**: KES, USD
- **Processing**: Instant

### Bank Transfer
- **Supported**: Kenyan banks
- **Currency**: KES
- **Processing**: 1-2 business days

## API Reference

### Initiate Payment

```typescript
interface PaymentRequest {
  amount: number;
  currency: string;
  method: 'M-PESA' | 'CARD' | 'BANK_TRANSFER';
  phone?: string;        // Required for M-PESA
  email?: string;        // Required for CARD
  description?: string;
  orderId?: string;
}

const response = await intaSendService.initiatePayment(request);
```

### Check Payment Status

```typescript
const paymentDetails = await intaSendService.checkPaymentStatus(paymentId);
```

### Payment Status Types

- `pending`: Payment initiated, awaiting completion
- `completed`: Payment successful
- `failed`: Payment failed
- `cancelled`: Payment cancelled by user

## Webhook Configuration

For production, configure webhooks in your IntaSend dashboard:

1. **Webhook URL**: `https://yourdomain.com/api/webhooks/intasend`
2. **Events**: Payment status changes
3. **Security**: Verify webhook signatures

## Security Considerations

### Environment Variables
- Never commit API keys to version control
- Use different keys for development and production
- Regularly rotate your API keys

### Data Protection
- Payment data is stored locally in browser
- No sensitive payment information is stored
- All API communication uses HTTPS

### Validation
- Validate payment amounts server-side
- Verify payment status before order fulfillment
- Implement rate limiting for API calls

## Troubleshooting

### Common Issues

1. **"API Key not configured"**
   - Check your `.env.local` file
   - Ensure keys are properly formatted
   - Restart your development server

2. **Payment stuck on "pending"**
   - Check IntaSend dashboard for real status
   - Verify webhook configuration
   - Check browser console for errors

3. **CORS errors**
   - Ensure correct base URL in environment
   - Check browser developer tools
   - Verify API endpoint accessibility

4. **Payment simulation not working**
   - Ensure you're in development mode
   - Check if API keys are set to placeholder values
   - Clear localStorage and try again

### Debug Mode

Enable debug logging:

```typescript
// Add to your application startup
localStorage.setItem('intasend_debug', 'true');
```

## Testing

### Sandbox Testing
- Use sandbox API endpoints
- Test with small amounts (KES 1)
- Verify all payment flows
- Test error scenarios

### Production Testing
- Start with small test transactions
- Monitor webhook delivery
- Test payment confirmations
- Verify order fulfillment process

## Deployment

### Environment Variables
Set environment variables in your hosting platform:

**Vercel:**
```bash
vercel env add VITE_INTASEND_PUBLISHABLE_KEY
vercel env add VITE_INTASEND_SECRET_KEY
```

**Netlify:**
- Add in site settings > Environment variables
- Include `VITE_` prefix for client-side access

**GitHub Pages:**
- Use repository secrets for CI/CD
- Not recommended for production payments

### Production Checklist

- [ ] API keys configured in production environment
- [ ] Webhook endpoints configured
- [ ] HTTPS enabled
- [ ] Error handling implemented
- [ ] Payment confirmations working
- [ ] Order fulfillment integrated
- [ ] Monitoring and logging set up

## Support

### IntaSend Documentation
- [API Documentation](https://intasend.com/docs)
- [Integration Guide](https://intasend.com/docs/integration)
- [Webhook Documentation](https://intasend.com/docs/webhooks)

### Common Resources
- Test card numbers: 4111111111111111
- Test M-PESA numbers: 254700000000
- Currency codes: KES, USD, EUR

## Examples

### Order Completion Flow

```typescript
// 1. User places order
const order = await createOrder(cartItems);

// 2. Initiate payment
const payment = await initiatePayment(
  order.id,
  userPhone,
  order.total,
  'M-PESA'
);

// 3. Redirect to payment
window.location.href = payment.checkout_url;

// 4. Handle return
// User returns with payment_id and status
const paymentStatus = await checkPaymentStatus(payment_id);

if (paymentStatus.status === 'completed') {
  await fulfillOrder(order.id);
  await clearCart();
}
```

### Payment Status Monitoring

```typescript
useEffect(() => {
  const handlePaymentUpdate = (event: CustomEvent) => {
    const { payment_id, status } = event.detail;
    
    if (status === 'completed') {
      toast.success('Payment successful!');
      navigate('/dashboard');
    }
  };

  window.addEventListener('paymentUpdate', handlePaymentUpdate);
  
  return () => {
    window.removeEventListener('paymentUpdate', handlePaymentUpdate);
  };
}, []);
```

