// ===========================================
// IntaSend Credentials Setup Guide
// ===========================================

/*
HOW TO GET INTASEND CREDENTIALS:

1. Go to IntaSend Dashboard: https://dashboard.intasend.com/
2. Login to your account (create one if needed)
3. Navigate to "API Settings" or "Integration"
4. You'll find:
   - Publishable Key (starts with ISPublicKey_test or ISPublicKey_live)
   - Secret Key (starts with ISSecretKey_test or ISSecretKey_live)

ENVIRONMENT VARIABLES TO SET:
- VITE_INTASEND_PUBLIC_KEY=your_publishable_key_here
- VITE_INTASEND_SECRET_KEY=your_secret_key_here

TESTING YOUR SETUP:
Run this test to verify your credentials work
*/

// Test function to verify IntaSend setup
export function testIntaSendCredentials() {
  const publicKey = import.meta.env.VITE_INTASEND_PUBLIC_KEY;
  const secretKey = import.meta.env.VITE_INTASEND_SECRET_KEY;
  
  console.log('🔍 Testing IntaSend Credentials...\n');
  
  if (!publicKey || !secretKey) {
    console.log('❌ MISSING CREDENTIALS');
    console.log('Please set these environment variables:');
    console.log('- VITE_INTASEND_PUBLIC_KEY');
    console.log('- VITE_INTASEND_SECRET_KEY');
    console.log('\n💡 Get them from: https://dashboard.intasend.com/');
    return false;
  }
  
  if (publicKey === 'YOUR_PUBLISHABLE_KEY' || secretKey === 'YOUR_SECRET_KEY') {
    console.log('⚠️  USING PLACEHOLDER CREDENTIALS');
    console.log('Please replace with real credentials from IntaSend dashboard');
    return false;
  }
  
  console.log('✅ CREDENTIALS FOUND');
  console.log(`Public Key: ${publicKey.substring(0, 20)}...`);
  console.log(`Secret Key: ${secretKey.substring(0, 20)}...`);
  
  const environment = secretKey.includes('test') ? 'SANDBOX' : 'PRODUCTION';
  console.log(`Environment: ${environment}`);
  console.log(`Base URL: ${secretKey.includes('test') ? 'https://sandbox.intasend.com/api/v1' : 'https://payment.intasend.com/api/v1'}`);
  
  return true;
}

// Auto-run test when this file is loaded
if (typeof window !== 'undefined') {
  testIntaSendCredentials();
}

export default { testIntaSendCredentials };
