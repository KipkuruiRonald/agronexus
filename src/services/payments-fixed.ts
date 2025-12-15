// Enhanced IntaSend Payment Service with Database Integration
// Handles payments using IntaSend API with proper phone number validation and CORS proxy

// Enhanced Types matching the provided structure
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'M-PESA' | 'CARD' | 'BANK_TRANSFER';

// Enhanced IntaSend API types
export interface IntasendConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

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
  phone?: string; // Required for M-PESA
  email?: string; // Required for CARD
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

// Enhanced IntaSend API Configuration
const INTASEND_BASE_URL = import.meta.env.VITE_INTASEND_BASE_URL || 'https://sandbox.intasend.com/api/v1';
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
  private config: IntasendConfig;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay

  constructor() {
    // Use Supabase Edge Function proxy to bypass CORS
    this.config = {
      publicKey: import.meta.env.VITE_INTASEND_PUBLIC_KEY || "",
      secretKey: import.meta.env.VITE_INTASEND_SECRET_KEY || "",
      baseUrl: import.meta.env.VITE_SUPABASE_URL + "/functions/v1/intasend-payment-proxy",
    };

    // Only show error if we have partial credentials (not in simulation mode)
    if ((this.config.publicKey && !this.config.secretKey) || (!this.config.publicKey && this.config.secretKey)) {
      console.warn(
        "[v0] Partial Intasend credentials found. Please set both VITE_INTASEND_PUBLIC_KEY and VITE_INTASEND_SECRET_KEY environment variables.",
      );
    }

    if (this.config.secretKey === 'YOUR_SECRET_KEY' || (!this.config.publicKey && !this.config.secretKey)) {
      console.log("[v0] Using simulation mode - no real credentials configured");
    } else if (this.config.secretKey && this.config.secretKey.includes("test")) {
      console.log("[v0] Using Intasend SANDBOX environment via Edge Function proxy");
    } else if (this.config.secretKey) {
      console.log("[v0] Using Intasend PRODUCTION environment via Edge Function proxy");
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.config.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "EarnPro/1.0",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    };
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

  // Use Edge Function proxy to make requests to IntaSend
  private async makeRequestViaProxy(action: string, paymentData?: any, invoiceId?: string): Promise<any> {
    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action,
          paymentData,
          invoiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(errorData.error?.message || 'Proxy request failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[v0] Edge Function proxy error:', error);
      throw error;
    }
  }

  async initiatePayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log("[v0] Initiating Intasend payment with data:", {
        ...paymentData,
        phone_number: paymentData.phone_number.substring(0, 6) + "***", // Mask phone for security
      });

      // Check if we're in simulation mode (no real credentials)
      if (this.config.secretKey === 'YOUR_SECRET_KEY' || !this.config.publicKey || !this.config.secretKey) {
        console.log("[v0] Using simulation mode - no real API call");
        // Return a mock response for simulation
        return {
          id: `sim_${Date.now()}`,
          invoice: {
            invoice_id: `sim_invoice_${Date.now()}`,
            state: "pending",
            provider: "M-PESA",
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

      // Use Edge Function proxy to make request to IntaSend (bypasses CORS)
      console.log("[v0] Using Edge Function proxy for IntaSend request");
      const result = await this.makeRequestViaProxy('initiate_payment', paymentData);
      
      console.log("[v0] Payment initiated successfully via proxy:", result.id);
      return result;
    } catch (error) {
      console.error("[v0] Intasend payment error:", error);
      throw error;
    }
  }

  async checkPaymentStatus(invoiceId: string): Promise<any> {
    try {
      // Use Edge Function proxy for status check
      return await this.makeRequestViaProxy('check_status', undefined, invoiceId);
    } catch (error: any) {
      console.error("Payment status check error:", error);
      throw error;
    }
  }

  async initiateWithdrawal(withdrawalData: WithdrawalRequest): Promise<any> {
    try {
      // For withdrawals, we might still need direct API calls
      const response = await this.makeRequest(`${this.config.baseUrl}/send-money/mpesa/`, {
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
      
      if (request.method === 'M-PESA' || !request.method) {
        // Use enhanced IntaSend API for M-PESA
        const formattedPhone = request.phone || paymentData.customerPhone;
        if (!formattedPhone) {
          throw new Error('Phone number is required for M-PESA payments');
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

        // Add user_id and description to payment data for database tracking
        const enhancedPaymentData = {
          ...paymentRequest,
          user_id: paymentData.userId,
          description: paymentData.orderDescription,
          order_id: `ORDER_${Date.now()}`,
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
            method: 'M-PESA',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          };
        } else {
          // Use real API via Edge Function proxy
          const response = await this.intasendAPI.initiatePayment(enhancedPaymentData);
          return {
            payment_id: response.invoice.invoice_id,
            checkout_url: `${window.location.origin}/payment/success?payment_id=${response.invoice.invoice_id}`,
            status: 'pending' as PaymentStatus,
            amount: paymentData.totalAmount,
            currency: 'KES',
            method: 'M-PESA',
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

      if (request.method === 'M-PESA') {
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
export const initiatePayment = (orderId: string, phoneNumber: string, amount: number, method: PaymentMethod = 'M-PESA') => {
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
export const initiatePaymentFromCart = async (method: PaymentMethod = 'M-PESA', phone?: string, email?: string) => {
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
