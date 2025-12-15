#!/bin/bash

# Deploy Edge Function for IntaSend Payment Proxy
# This script deploys the Supabase Edge Function to bypass CORS restrictions

echo "🚀 Deploying IntaSend Payment Proxy Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase..."
    supabase login
fi

# Link project (if not already linked)
echo "🔗 Linking Supabase project..."
supabase link --project-ref $(grep SUPABASE_PROJECT_ID .env 2>/dev/null | cut -d'=' -f2 || echo "your-project-id")

# Deploy the Edge Function
echo "📤 Deploying Edge Function..."
supabase functions deploy intasend-payment-proxy

# Set environment variables
echo "⚙️  Setting up environment variables..."
echo "Please set these in your Supabase Dashboard > Settings > Environment Variables:"
echo ""
echo "INTASEND_PUBLIC_KEY=ISPublicKey_live_your_real_key"
echo "INTASEND_SECRET_KEY=ISSecretKey_live_your_real_secret"
echo ""

echo "✅ Edge Function deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set your IntaSend live credentials in Supabase environment variables"
echo "2. Copy payments-fixed.ts over your current payments.ts"
echo "3. Test the integration"
echo ""
echo "🎉 Your IntaSend payments are now ready for production!"
