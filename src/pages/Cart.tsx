import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import {
  AlertCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Cart() {
  const {
    cartItems,
    updateCartItem,
    removeFromCart,
    getCartTotal,
    getCartItemsCount,
    isLoading,
  } = useCart();

  const updateQuantity = async (itemId: string, change: number) => {
    const item = cartItems.find(cartItem => cartItem.id === itemId);
    if (!item) return;
    
    const newQuantity = Math.max(0, item.quantity + change);
    
    if (newQuantity === 0) {
      await removeFromCart(itemId);
    } else {
      await updateCartItem(itemId, newQuantity);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  const subtotal = getCartTotal();
  const shippingCost = 500;
  const tax = subtotal * 0.16;
  const total = subtotal + shippingCost + tax;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your cart...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display font-bold text-3xl">Shopping Cart</h1>
            {cartItems.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {getCartItemsCount()} {getCartItemsCount() === 1 ? 'item' : 'items'}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              {cartItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="font-display font-bold text-xl mb-2">
                      Your cart is empty
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Start shopping to add items to your cart
                    </p>
                    <Button variant="hero" asChild>
                      <Link to="/marketplace">Continue Shopping</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const product = item.product;
                    if (!product) return null;
                    
                    return (
                      <Card key={item.id} variant="elevated">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Image */}
                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={product.image_url || '/assets/hero-farm.jpg'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                              <h3 className="font-display font-bold text-lg">
                                {product.name}
                              </h3>
                              <p className="text-muted-foreground text-sm">
                                by {product.farmer_name || 'Farmer'}
                              </p>
                              <p className="text-primary font-bold mt-2">
                                KES {product.price}/{product.unit}
                              </p>
                              {product.is_organic && (
                                <Badge variant="success" className="mt-1">
                                  Organic
                                </Badge>
                              )}
                            </div>

                            {/* Quantity & Actions */}
                            <div className="flex flex-col items-end justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="font-semibold w-8 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="font-display font-bold text-lg">
                                KES {(product.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Summary */}
            {cartItems.length > 0 && (
              <div>
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary Details */}
                    <div className="space-y-3 pb-4 border-b border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">KES {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-semibold">KES {shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax (16%)</span>
                        <span className="font-semibold">KES {tax.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-display font-bold text-lg">
                        Total
                      </span>
                      <span className="font-display font-bold text-2xl text-primary">
                        KES {total.toFixed(2)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="bg-sky/10 border border-sky/20 rounded-lg p-3 flex gap-3 mb-6">
                      <AlertCircle className="w-5 h-5 text-sky flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Secure checkout. Your payment information is encrypted.
                      </p>
                    </div>


                    {/* CTA */}
                    <Button variant="hero" size="lg" className="w-full" asChild>
                      <Link to="/checkout">Proceed to Checkout</Link>
                    </Button>
                    <Button variant="outline" size="lg" className="w-full" asChild>
                      <Link to="/marketplace">Continue Shopping</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Trust Badges */}
                <div className="mt-6 space-y-3">
                  <div className="text-center text-sm text-muted-foreground">
                    ✓ 100% Secure Payment
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    ✓ Direct from Farmers
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    ✓ Quality Guaranteed
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

