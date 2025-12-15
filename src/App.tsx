

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CartProvider } from "./hooks/useCart";

import About from "./pages/About";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Insights from "./pages/Insights";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <BrowserRouter>
          {/* Try to hydrate user from server-set cookie on app start */}
          <HydrateAuth />
          <Routes>

            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/about" element={<About />} />
            <Route path="/cart" element={<Cart />} />

            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment/success" element={<Checkout />} />
            <Route path="/payment/cancelled" element={<Checkout />} />
            <Route path="/payment/simulated/:paymentId" element={<Checkout />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

function HydrateAuth() {
  useEffect(() => {
    import("@/services/auth").then(async (m) => {
      try {
        const auth = m.default;
        // If there is no local user stored but an HttpOnly cookie exists,
        // call the backend to fetch the current user and store locally.
        if (!auth.getUser()) {
          const me = await auth.getMe();
          if (me) auth.setUser(me);
        }
      } catch (e) {
        // Ignore failures (user not authenticated)
      }
    });
  }, []);
  return null;
}
