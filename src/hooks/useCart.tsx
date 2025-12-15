import { createContext, useContext, useEffect, useState } from 'react';
import * as cartService from '../services/cart';
import { CartItem } from '../services/cart';
import * as productService from '../services/products';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = async () => {
    setIsLoading(true);
    try {
      const items = await cartService.getCart();
      // Enhance cart items with product data
      const enhancedItems = await Promise.all(
        items.map(async (item) => {
          const product = await productService.getProduct(item.product_id);
          return { ...item, product };
        })
      );
      setCartItems(enhancedItems);
    } catch (error) {
      console.error('Error refreshing cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId: string, quantity = 1) => {
    try {
      await cartService.addToCart({ product_id: productId, quantity });
      await refreshCart();
      console.log('✅ Product added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    try {
      await cartService.updateCartItem(itemId, { quantity });
      await refreshCart();
      console.log('✅ Cart item updated successfully');
    } catch (error) {
      console.error('Error updating cart item:', error);
      if (error.message === 'Item removed from cart') {
        await refreshCart();
      }
      throw error;
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await cartService.removeCartItem(itemId);
      await refreshCart();
      console.log('✅ Item removed from cart successfully');
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
      setCartItems([]);
      console.log('✅ Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const getCartTotal = (): number => {
    return cartItems.reduce((total, item) => {
      const price = item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const getCartItemsCount = (): number => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const value: CartContextType = {
    cartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemsCount,
    isLoading,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

