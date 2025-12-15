import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";


import { initiatePaymentFromCart, intaSendService, PaymentMethod } from "@/services/payments-simple";
import {
    CheckCircle,
    CreditCard,
    Loader2,
    Shield,
    Smartphone
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { cartItems, getCartTotal, clearCart } = useCart();
  const { toast } = useToast();
  

  // Payment form state
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    paymentMethod: "M-PESA" as PaymentMethod,
  });
  
  // Payment state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  // Check for payment status from URL params
  useEffect(() => {
    const status = searchParams.get("status");
    const paymentId = searchParams.get("payment_id");
    
    if (status && paymentId) {
      if (status === "success") {
        handlePaymentSuccess(paymentId);
      } else if (status === "failed") {
        handlePaymentFailed();
      }
    }
  }, [searchParams]);


  const totalAmount = getCartTotal();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setFormData(prev => ({ 
      ...prev, 
      paymentMethod: method,
      // Clear required fields when switching methods
      phone: method !== "M-PESA" ? "" : prev.phone,
      email: method !== "CARD" ? "" : prev.email,
    }));
  };


  const validateForm = () => {
    if (formData.paymentMethod === "M-PESA") {
      if (!formData.phone) {
        toast({
          title: "Phone number required",
          description: "Please enter your M-PESA phone number.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (!formData.email && formData.paymentMethod === "CARD") {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return false;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before proceeding to checkout.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      const details = await intaSendService.checkPaymentStatus(paymentId);
      setPaymentDetails(details);
      setPaymentStatus("success");
      
      // Clear cart on successful payment
      clearCart();
      
      toast({
        title: "Payment successful!",
        description: `Your payment of KES ${details.amount} has been processed successfully.`,
      });
    } catch (error) {
      console.error("Payment verification failed:", error);
    }
  };

  const handlePaymentFailed = () => {
    setPaymentStatus("failed");
    toast({
      title: "Payment failed",
      description: "Your payment could not be processed. Please try again.",
      variant: "destructive",
    });
  };




  const processPayment = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    setPaymentStatus("processing");

    try {
      // Use enhanced payment method with Supabase database integration
      // User data (name, email) will be automatically pulled from Supabase
      const response = await initiatePaymentFromCart(
        formData.paymentMethod,
        formData.phone || undefined,
        formData.email || undefined
      );
      
      setPaymentId(response.payment_id);
      
      // For development/testing, simulate payment completion
      if (response.checkout_url.includes("/payment/simulated/")) {
        // Simulate payment processing
        setTimeout(async () => {
          const success = Math.random() > 0.2; // 80% success rate for demo
          
          if (success) {
            await intaSendService.checkPaymentStatus(response.payment_id);
            // Update local storage to mark as completed
            const payment = intaSendService.getStoredPayment(response.payment_id);
            if (payment) {
              payment.status = "completed";
              intaSendService['savePaymentDetails'](payment);
            }
            handlePaymentSuccess(response.payment_id);
          } else {
            handlePaymentFailed();
          }
        }, 3000);
      } else {
        // Real IntaSend integration
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      console.error("Payment processing failed:", error);
      setPaymentStatus("failed");
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === "success" && paymentDetails) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-20 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card variant="elevated" className="text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  
                  <h1 className="font-display font-bold text-2xl mb-2">
                    Payment Successful!
                  </h1>
                  
                  <p className="text-muted-foreground mb-6">
                    Your order has been confirmed and will be processed shortly.
                  </p>
                  
                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Payment ID</p>
                        <p className="font-mono">{paymentDetails.payment_id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-bold text-primary">KES {paymentDetails.amount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Method</p>
                        <p>{paymentDetails.method}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant="success">Completed</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/marketplace")}
                    >
                      Continue Shopping
                    </Button>
                    <Button 
                      variant="hero" 
                      onClick={() => navigate("/dashboard")}
                    >
                      View Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="font-display font-bold text-3xl mb-2">Checkout</h1>
              <p className="text-muted-foreground">
                Complete your purchase securely with IntaSend
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Order Summary */}
              <div className="lg:col-span-2">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Shopping Cart
                      <Badge variant="info">{cartItems.length} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">

                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                            {item.product?.image_url ? (
                              <img 
                                src={item.product.image_url} 
                                alt={item.product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-primary font-bold text-sm">
                                {item.product?.name?.charAt(0) || 'P'}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.product?.name || 'Product'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.product?.farmer_name || 'Farmer'} • {item.quantity} {item.product?.unit || 'unit'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              KES {item.product?.price || 0} each
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold">KES {((item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method Selection */}
                <Card variant="elevated" className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-3 gap-4 mb-6">
                      <button
                        onClick={() => handlePaymentMethodChange("M-PESA")}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.paymentMethod === "M-PESA"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Smartphone className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">M-PESA</p>
                        <p className="text-xs text-muted-foreground">Mobile Money</p>
                      </button>

                      <button
                        onClick={() => handlePaymentMethodChange("CARD")}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.paymentMethod === "CARD"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">Card</p>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                      </button>

                      <button
                        onClick={() => handlePaymentMethodChange("BANK_TRANSFER")}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.paymentMethod === "BANK_TRANSFER"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">Direct to Bank</p>
                      </button>
                    </div>

                    {/* User Information Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">User Information</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Your name and email will be automatically retrieved from your Supabase profile 
                            to complete the payment securely.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Form */}
                    <div className="space-y-4">
                      {formData.paymentMethod === "M-PESA" && (
                        <div>
                          <Label htmlFor="phone">M-PESA Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="254700000000"
                            value={formData.phone}
                            onChange={(e) => handleInputChange("phone", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}

                      {formData.paymentMethod === "CARD" && (
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Total */}
              <div>
                <Card variant="elevated" className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Subtotal ({cartItems.length} items)</span>
                        <span>KES {totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Fee</span>
                        <span>KES 0.00</span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span className="text-primary">KES {totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full mt-6"
                      onClick={processPayment}
                      disabled={isProcessing || cartItems.length === 0}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Pay with {formData.paymentMethod}
                        </>
                      )}
                    </Button>

                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        <span>Secured by IntaSend</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your payment information is encrypted and secure
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
