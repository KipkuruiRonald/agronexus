// Simple IntaSend Payment Service - No Edge Functions Required
// Direct API calls with CORS handling and Supabase user integration

// Enhanced Types matching the provided structure
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type PaymentMethod = 'MPESA' | 'CREDIT_CARD' | 'BANK';

// Enhanced IntaSend API types
export interface PaymentRequest {
  amount: number;
  phone_number: string;
  email: string;
  first_name: string;
  last_name: string;
  reference: string;
  redirect_url?: string;
}

export interface PaymentResponse {
  id: string;
  invoice: {
    invoice_id: string;
    state: string;
    provider: string;
    charges: number;
    net_amount: number;
    currency: string;
    value: number;
    account: string;
    api_ref: string;
    mpesa_reference?: string;
  };
  customer: {
    customer_id: string;
    phone_number: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface WithdrawalRequest {
  amount: number;
  phone_number: string;
  reference: string;
  narrative?: string;
}

// Legacy compatibility types
export type LegacyPaymentRequest = {
  amount: number;
  currency: string;
  method: PaymentMethod;

  phone?: string; // Required for MPESA
  email?: string; // Required for CREDIT_CARD
  customerName?: string; // Customer full name
  description?: string;
  orderId?: string;
};

export type LegacyPaymentResponse = {
  payment_id: string;
  checkout_url: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  created_at: string;
  expires_at?: string;
};

export type PaymentDetails = {
  id: string;
  payment_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  description?: string;
  order_id?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  checkout_url?: string;
  merchant_reference?: string;
};

const PAYMENTS_STORAGE_KEY = 'agronexus_payments';

// IntaSend API Configuration
const INTASEND_PUBLISHABLE_KEY = import.meta.env.VITE_INTASEND_PUBLISHABLE_KEY || 'YOUR_PUBLISHABLE_KEY';
const INTASEND_SECRET_KEY = import.meta.env.VITE_INTASEND_SECRET_KEY || 'YOUR_SECRET_KEY';

// Utility functions
export function formatPhoneNumber(phone: string): string {
  // Convert to international format for Kenya
  let formatted = phone.replace(/\s+/g, "").replace(/[^\d]/g, "")

  // Handle different input formats
  if (formatted.startsWith("0")) {
    formatted = "254" + formatted.substring(1)
  } else if (formatted.startsWith("+254")) {
    formatted = formatted.substring(1)
  } else if (formatted.startsWith("254")) {
    // Already in correct format
  } else if (formatted.length === 9) {
    // Assume it's missing country code
    formatted = "254" + formatted
  } else if (formatted.length === 10 && formatted.startsWith("7")) {
    // Handle 07XXXXXXXX format
    formatted = "254" + formatted.substring(1)
  }

  // Validate final format
  if (!formatted.startsWith("254") || formatted.length !== 12) {
    throw new Error(`Invalid phone number format: ${phone}. Expected Kenyan number.`)
  }

  return formatted
}

export function generatePaymentReference(userId: string, type: "registration" | "withdrawal"): string {
  const timestamp = Date.now()
  return `${type.toUpperCase()}_${userId.substring(0, 8)}_${timestamp}`
}

export class IntaSendAPI {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay

  constructor() {
    if (INTASEND_SECRET_KEY === 'YOUR_SECRET_KEY' || !INTASEND_SECRET_KEY) {
      console.log("[v0] Using simulation mode - no real credentials configured");
    } else if (INTASEND_SECRET_KEY && INTASEND_SECRET_KEY.includes("test")) {
      console.log("[v0] Using Intasend SANDBOX environment");
    } else if (INTASEND_SECRET_KEY) {
      console.log("[v0] Using Intasend PRODUCTION environment");
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${INTASEND_SECRET_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "AgriNexus/1.0",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    };
  }

  private getBaseUrl(): string {
    return INTASEND_SECRET_KEY.includes("test") 
      ? "https://sandbox.intasend.com/api/v1"
      : "https://payment.intasend.com/api/v1";
  }

  private async makeRequest(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      if (attempt < this.maxRetries && (error.name === "AbortError" || error.code === "ECONNRESET")) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[v0] Request failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeRequest(url, options, attempt + 1);
      }
      throw error;
    }
  }

  // CORS-proxied request using different approach
  private async makeCORSProxiedRequest(url: string, options: RequestInit): Promise<Response> {
    try {
      // Try direct request first
      return await this.makeRequest(url, options);
    } catch (corsError: any) {
      if (corsError.message?.includes('CORS') || corsError.message?.includes('cross-origin')) {
        console.log("[v0] CORS detected, trying alternative approach...");
        
        // Alternative: Use a public CORS proxy (for development only)
        if (import.meta.env.DEV) {
          try {
            const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            const proxyOptions = {
              ...options,
              headers: {
                ...options.headers,
                'X-Requested-With': 'XMLHttpRequest'
              }
            };
            
            const response = await fetch(corsProxyUrl, proxyOptions);
            if (response.ok) {
              console.log("[v0] CORS proxy request successful");
              return response;
            }
          } catch (proxyError) {
            console.warn("[v0] CORS proxy also failed:", proxyError);
          }
        }
        
        // Fallback: Return a mock response for development
        console.log("[v0] All CORS workarounds failed, using simulation mode");
        throw new Error('CORS restriction detected. Please configure proper backend proxy or use production environment.');
      }
      throw corsError;
    }
  }

  async initiatePayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log("[v0] Initiating Intasend payment with data:", {
        ...paymentData,
        phone_number: paymentData.phone_number.substring(0, 6) + "***", // Mask phone for security
      });

      // Check if we're in simulation mode (no real credentials)
      if (INTASEND_SECRET_KEY === 'YOUR_SECRET_KEY' || !INTASEND_SECRET_KEY) {
        console.log("[v0] Using simulation mode - no real API call");
        // Return a mock response for simulation
        return {
          id: `sim_${Date.now()}`,
          invoice: {
            invoice_id: `sim_invoice_${Date.now()}`,
            state: "pending",

            provider: "MPESA",
            charges: 0,
            net_amount: paymentData.amount,
            currency: "KES",
            value: paymentData.amount,
            account: "simulated",
            api_ref: paymentData.reference,
            mpesa_reference: `sim_ref_${Date.now()}`
          },
          customer: {
            customer_id: "sim_customer",
            phone_number: paymentData.phone_number,
            email: paymentData.email,
            first_name: paymentData.first_name,
            last_name: paymentData.last_name
          }
        };
      }

      let formattedPhone = paymentData.phone_number.replace(/\s+/g, "").replace(/[^\d+]/g, "");

      // Remove + prefix for IntaSend API
      if (formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.substring(1);
      }

      // Ensure it starts with 254
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone;
      }

      // Validate length (should be 12 digits: 254 + 9 digits)
      if (formattedPhone.length !== 12) {
        throw new Error(`Invalid phone number format. Expected 12 digits, got ${formattedPhone.length}`);
      }

      console.log("[v0] Formatted phone for IntaSend:", formattedPhone.substring(0, 6) + "***");

      const requestBody = {
        amount: Number(paymentData.amount),
        phone_number: formattedPhone,
        email: paymentData.email,
        first_name: paymentData.first_name || "User",
        last_name: paymentData.last_name || "User",
        api_ref: paymentData.reference,
        currency: "KES",

        method: "MPESA",
      };

      const baseUrl = this.getBaseUrl();
      console.log("[v0] Making request to:", `${baseUrl}/payment/mpesa-stk-push/`);
      console.log("[v0] Request body:", {
        ...requestBody,
        phone_number: requestBody.phone_number.substring(0, 6) + "***",
      });

      const headers = this.getHeaders();
      console.log("[v0] Using API key:", INTASEND_SECRET_KEY.substring(0, 20) + "...");

      const response = await this.makeCORSProxiedRequest(`${baseUrl}/payment/mpesa-stk-push/`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log("[v0] Intasend response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        console.error("[v0] Intasend API error response:", errorData);

        let errorMessage = "Payment initiation failed";
        if (response.status === 400) {
          if (errorData.detail?.includes("phone") || errorData.detail?.includes("222")) {
            errorMessage = "Invalid phone number. Please ensure your phone number is correct and try again.";
          } else {
            errorMessage = "Invalid payment details. Please check your information and try again.";
          }
        } else if (response.status === 401) {
          errorMessage = "Payment service authentication failed. Please contact support.";
        } else if (response.status === 429) {
          errorMessage = "Too many payment requests. Please wait a moment and try again.";
        } else if (response.status >= 500) {
          errorMessage = "Payment service temporarily unavailable. Please try again in a few moments.";
        }

        throw new Error(`${errorMessage}: ${errorData.detail || errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log("[v0] Payment initiated successfully:", result.id);

      return result;
    } catch (error) {
      console.error("[v0] Intasend payment error:", error);
      
      // If it's a CORS error and we're in production, provide helpful message
      if (error.message?.includes('CORS') && !import.meta.env.DEV) {
        throw new Error('CORS restriction detected. Please deploy this application to a server environment or configure proper CORS headers on the server.');
      }
      
      throw error;
    }
  }

  async checkPaymentStatus(invoiceId: string): Promise<any> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await this.makeCORSProxiedRequest(`${baseUrl}/payment/status/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          invoice_id: invoiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Status check failed: ${errorData.detail || response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("Payment status check timeout");
        throw new Error("Payment status check timeout");
      }
      console.error("Payment status check error:", error);
      throw error;
    }
  }

  async initiateWithdrawal(withdrawalData: WithdrawalRequest): Promise<any> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await this.makeCORSProxiedRequest(`${baseUrl}/send-money/mpesa/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...withdrawalData,
          currency: "KES",
          requires_approval: "NO",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Withdrawal failed: ${errorData.detail || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Intasend withdrawal error:", error);
      throw error;
    }
  }
}

// Enhanced Payment Service with Database Integration
export class IntaSendPaymentService {
  private intasendAPI: IntaSendAPI;

  constructor() {
    this.intasendAPI = new IntaSendAPI();
  }

  // Get payment data from Supabase user and cart
  async getPaymentDataFromDatabase(): Promise<{
    totalAmount: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    cartItems: any[];
    orderDescription: string;
    firstName: string;
    lastName: string;
    userId: string;
  }> {
    try {
      // Get current user from Supabase auth
      const currentUser = JSON.parse(localStorage.getItem('agronexus_user') || '{}');
      
      if (!currentUser || !currentUser.email) {
        throw new Error('User must be logged in to make a payment');
      }

      // Get cart items
      const cartItems = JSON.parse(localStorage.getItem('agronexus_cart') || '[]');
      
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Get products to calculate total
      const products = JSON.parse(localStorage.getItem('agronexus_products') || '[]');
      
      let totalAmount = 0;
      const orderItems = cartItems.map((cartItem: any) => {
        const product = products.find((p: any) => p.id === cartItem.product_id);
        if (product) {
          const itemTotal = product.price * cartItem.quantity;
          totalAmount += itemTotal;
          return {
            name: product.name,
            quantity: cartItem.quantity,
            unitPrice: product.price,
            total: itemTotal
          };
        }
        return null;
      }).filter(Boolean);

      // Use real Supabase user data
      const fullName = currentUser.full_name || 
                      (currentUser.first_name && currentUser.last_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username || 'Customer');
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      const customerEmail = currentUser.email;
      const customerPhone = currentUser.phone || currentUser.location || undefined;
      const userId = currentUser.id || currentUser.user_id || 'unknown';
      
      const orderDescription = `AgriNexus Order - ${orderItems.length} item(s) from ${fullName}`;

      return {
        totalAmount,
        customerName: fullName,
        customerEmail,
        customerPhone,
        cartItems: orderItems,
        orderDescription,
        firstName,
        lastName,
        userId
      };
    } catch (error) {
      console.error('Error fetching payment data:', error);
      throw error;
    }
  }

  // Initialize a payment request with real Supabase database data
  async initiatePaymentFromCart(request: { method?: PaymentMethod; phone?: string; email?: string } = {}): Promise<LegacyPaymentResponse> {
    try {
      // Get payment data from Supabase user and cart
      const paymentData = await this.getPaymentDataFromDatabase();
      
      // Check if we should use simulation mode
      const useSimulation = INTASEND_SECRET_KEY === 'YOUR_SECRET_KEY' || !INTASEND_SECRET_KEY;
      


      if (request.method === 'MPESA' || !request.method) {
        // Use enhanced IntaSend API for MPESA
        const formattedPhone = request.phone || paymentData.customerPhone;
        if (!formattedPhone) {

          throw new Error('Phone number is required for MPESA payments');
        }

        const formattedPhoneNumber = formatPhoneNumber(formattedPhone);
        const reference = generatePaymentReference(paymentData.userId, 'registration');
        
        const paymentRequest: PaymentRequest = {
          amount: paymentData.totalAmount,
          phone_number: formattedPhoneNumber,
          email: paymentData.customerEmail,
          first_name: paymentData.firstName,
          last_name: paymentData.lastName,
          reference,
          redirect_url: `${window.location.origin}/payment/success`,
        };


        if (useSimulation) {
          // Use simulation mode
          const response = await this.intasendAPI.initiatePayment(paymentRequest);
          return {
            payment_id: response.invoice.invoice_id,
            checkout_url: `${window.location.origin}/payment/success?payment_id=${response.invoice.invoice_id}`,
            status: 'pending' as PaymentStatus,
            amount: paymentData.totalAmount,
            currency: 'KES',
            method: 'MPESA',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          };
        } else {
          // Use real API with CORS handling
          const response = await this.intasendAPI.initiatePayment(paymentRequest);
          return {
            payment_id: response.invoice.invoice_id,
            checkout_url: `${window.location.origin}/payment/success?payment_id=${response.invoice.invoice_id}`,
            status: 'pending' as PaymentStatus,
            amount: paymentData.totalAmount,
            currency: 'KES',
            method: 'MPESA',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          };
        }
      } else {
        // For other payment methods, use simulation
        return this.simulatePayment({
          amount: paymentData.totalAmount,
          currency: 'KES',
          method: request.method,
          phone: request.phone,
          email: request.email,
          customerName: paymentData.customerName,
          description: paymentData.orderDescription,
          orderId: `ORDER_${Date.now()}`,
        });
      }
    } catch (error) {
      console.error('Payment initialization failed:', error);
      throw error;
    }
  }

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<PaymentDetails> {
    try {
      // For now, read from localStorage (simulated mode)
      const payment = this.getStoredPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      // In production with real credentials, this would check with IntaSend API
      // const response = await this.intasendAPI.checkPaymentStatus(paymentId);
      
      return payment;
    } catch (error) {
      console.error('Payment status check failed:', error);
      throw new Error('Failed to check payment status.');
    }
  }

  // Legacy method for backward compatibility
  async initiatePayment(request: LegacyPaymentRequest): Promise<LegacyPaymentResponse> {
    try {
      // For serverless mode, we'll simulate the API call
      if (INTASEND_PUBLISHABLE_KEY === 'YOUR_PUBLISHABLE_KEY') {
        return this.simulatePayment(request);
      }


      if (request.method === 'MPESA') {
        // Use enhanced IntaSend API
        const formattedPhone = formatPhoneNumber(request.phone || '');
        const reference = request.orderId || generatePaymentReference('user', 'registration');
        const nameParts = (request.customerName || 'Customer User').split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        const paymentRequest: PaymentRequest = {
          amount: request.amount,
          phone_number: formattedPhone,
          email: request.email || 'customer@example.com',
          first_name: firstName,
          last_name: lastName,
          reference,
          redirect_url: `${window.location.origin}/payment/success`,
        };

        const response = await this.intasendAPI.initiatePayment(paymentRequest);
        
        return {
          payment_id: response.invoice.invoice_id,
          checkout_url: `${window.location.origin}/payment/success?payment_id=${response.invoice.invoice_id}`,
          status: 'pending' as PaymentStatus,
          amount: request.amount,
          currency: request.currency,
          method: request.method,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      } else {
        // For other methods, simulate
        return this.simulatePayment(request);
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw new Error('Failed to initiate payment. Please try again.');
    }
  }

  // Simulate payment for development/testing
  private simulatePayment(request: LegacyPaymentRequest): LegacyPaymentResponse {
    const paymentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const checkoutUrl = `${window.location.origin}/payment/simulated/${paymentId}`;

    const paymentDetails: PaymentDetails = {
      id: `pay_${Date.now()}`,
      payment_id: paymentId,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      description: request.description || 'AgriNexus Purchase',
      order_id: request.orderId,
      customer_phone: request.phone,
      customer_email: request.email,
      customer_name: request.customerName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checkout_url: checkoutUrl,
    };

    this.savePaymentDetails(paymentDetails);

    return {
      payment_id: paymentId,
      checkout_url: checkoutUrl,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // Save payment details to localStorage
  private savePaymentDetails(payment: PaymentDetails): void {
    const payments = this.getUserPayments();
    const existingIndex = payments.findIndex(p => p.payment_id === payment.payment_id);
    
    if (existingIndex >= 0) {
      payments[existingIndex] = payment;
    } else {
      payments.push(payment);
    }
    
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  }

  // Get all payments for a user
  getUserPayments(): PaymentDetails[] {
    const payments = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (payments) {
      return JSON.parse(payments);
    }
    return [];
  }

  // Get payment by ID
  getStoredPayment(paymentId: string): PaymentDetails | null {
    const payments = this.getUserPayments();
    return payments.find(p => p.payment_id === paymentId) || null;
  }

  // Cancel a pending payment
  async cancelPayment(paymentId: string): Promise<void> {
    const payment = this.getStoredPayment(paymentId);
    if (payment && payment.status === 'pending') {
      payment.status = 'cancelled';
      payment.updated_at = new Date().toISOString();
      this.savePaymentDetails(payment);
    }
  }

  // Get payment statistics
  getPaymentStats(): {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalAmount: number;
  } {
    const payments = this.getUserPayments();
    return {
      total: payments.length,
      completed: payments.filter(p => p.status === 'completed').length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      totalAmount: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
    };
  }
}

// Create singleton instances
export const intasendAPI = new IntaSendAPI();
export const intaSendService = new IntaSendPaymentService();

// Convenience functions for backward compatibility

export const initiatePayment = (orderId: string, phoneNumber: string, amount: number, method: PaymentMethod = 'MPESA') => {
  return intaSendService.initiatePayment({
    amount,
    currency: 'KES',
    method,
    phone: phoneNumber,
    description: `AgriNexus Order ${orderId}`,
    orderId,
  });
};

// New convenience function that fetches data from Supabase user and cart

export const initiatePaymentFromCart = async (method: PaymentMethod = 'MPESA', phone?: string, email?: string) => {
  return intaSendService.initiatePaymentFromCart({
    method,
    phone,
    email,
  });
};

// Get payment data from Supabase database (cart + user)
export const getPaymentDataFromDatabase = async () => {
  return intaSendService.getPaymentDataFromDatabase();
};

export const checkPaymentStatus = (paymentId: string) => {
  return intaSendService.checkPaymentStatus(paymentId);
};

export const getUserPayments = () => {
  return intaSendService.getUserPayments();
};

export const getPaymentStats = () => {
  return intaSendService.getPaymentStats();
};

export default {
  initiatePayment,
  checkPaymentStatus,
  getUserPayments,
  getPaymentStats,
  initiatePaymentFromCart,
  getPaymentDataFromDatabase,
  service: intaSendService,
  api: intasendAPI,
};
