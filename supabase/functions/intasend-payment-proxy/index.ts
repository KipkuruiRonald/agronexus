// Supabase Edge Function: Intasend Payment Proxy
// This function handles IntaSend API calls to bypass CORS restrictions
// Deploy with: supabase functions deploy intasend-payment-proxy

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get request data
    const { action, paymentData, invoiceId } = await req.json();

    // Get IntaSend credentials from environment
    const intasendPublicKey = Deno.env.get('INTASEND_PUBLIC_KEY');
    const intasendSecretKey = Deno.env.get('INTASEND_SECRET_KEY');
    
    if (!intasendPublicKey || !intasendSecretKey) {
      throw new Error('Intasend credentials not configured');
    }

    // Determine base URL based on secret key
    const baseUrl = intasendSecretKey.includes('test') 
      ? 'https://sandbox.intasend.com/api/v1'
      : 'https://payment.intasend.com/api/v1';

    const headers = {
      'Authorization': `Bearer ${intasendSecretKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AgriNexus/1.0',
    };

    let result;

    if (action === 'initiate_payment') {
      // Format phone number for IntaSend API
      let formattedPhone = paymentData.phone_number.replace(/\s+/g, "").replace(/[^\d+]/g, "");
      
      // Remove + prefix for Intasend API
      if (formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.substring(1);
      }

      // Ensure it starts with 254
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone;
      }

      // Validate length
      if (formattedPhone.length !== 12) {
        throw new Error(`Invalid phone number format. Expected 12 digits, got ${formattedPhone.length}`);
      }

      const requestBody = {
        amount: Number(paymentData.amount),
        phone_number: formattedPhone,
        email: paymentData.email,
        first_name: paymentData.first_name || "Users",
        last_name: paymentData.last_name || "Users",
        api_ref: paymentData.reference,
        currency: "KES",
        method: "M-PESA",
      };

      // Make request to IntaSend
      const response = await fetch(`${baseUrl}/payment/mpesa-stk-push/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(`Payment initiation failed: ${errorData.detail || response.statusText}`);
      }

      result = await response.json();

      // Note: Database operations would need to be done separately
      // or through RPC functions for security

    } else if (action === 'check_status') {
      // Check payment status
      const response = await fetch(`${baseUrl}/payment/status/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invoice_id: invoiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Status check failed: ${errorData.detail || response.statusText}`);
      }

      result = await response.json();

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Edge function error:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'PAYMENT_ERROR',
        message: error.message || 'Payment processing failed'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
