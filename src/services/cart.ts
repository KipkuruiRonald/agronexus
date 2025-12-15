import { Product } from './products';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
  created_at: string;
  updated_at: string;
}

const CART_STORAGE_KEY = 'agronexus_cart';

// Helper function to get cart from localStorage
const getCartFromStorage = (): CartItem[] => {
  const cart = localStorage.getItem(CART_STORAGE_KEY);
  return cart ? JSON.parse(cart) : [];
};

// Helper function to save cart to localStorage
const saveCartToStorage = (cart: CartItem[]): void => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
};

// Helper function to simulate network delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const getCart = async (): Promise<CartItem[]> => {
  await delay(200);
  return getCartFromStorage();
};

export const addToCart = async (payload: { product_id: string; quantity?: number }): Promise<CartItem> => {
  await delay(300);
  
  const cart = getCartFromStorage();
  const existingItem = cart.find(item => item.product_id === payload.product_id);
  
  if (existingItem) {
    // Update existing item
    existingItem.quantity += payload.quantity || 1;
    existingItem.updated_at = new Date().toISOString();
  } else {
    // Add new item
    const newItem: CartItem = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
      product_id: payload.product_id,
      quantity: payload.quantity || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    cart.push(newItem);
  }
  
  saveCartToStorage(cart);
  
  // Simulate API response
  const cartItem = existingItem || cart[cart.length - 1];
  console.log('✅ Item added to cart:', cartItem);
  return cartItem;
};

export const updateCartItem = async (id: string, payload: { quantity: number }): Promise<CartItem> => {
  await delay(200);
  
  const cart = getCartFromStorage();
  const item = cart.find(item => item.id === id);
  
  if (!item) {
    throw new Error('Cart item not found');
  }
  
  if (payload.quantity <= 0) {
    // Remove item if quantity is 0 or negative
    const index = cart.findIndex(item => item.id === id);
    cart.splice(index, 1);
    saveCartToStorage(cart);
    throw new Error('Item removed from cart');
  }
  
  item.quantity = payload.quantity;
  item.updated_at = new Date().toISOString();
  
  saveCartToStorage(cart);
  console.log('✅ Cart item updated:', item);
  return item;
};

export const removeCartItem = async (id: string): Promise<void> => {
  await delay(200);
  
  const cart = getCartFromStorage();
  const index = cart.findIndex(item => item.id === id);
  
  if (index === -1) {
    throw new Error('Cart item not found');
  }
  
  cart.splice(index, 1);
  saveCartToStorage(cart);
  console.log('✅ Item removed from cart');
};

export const clearCart = async (): Promise<void> => {
  await delay(200);
  localStorage.removeItem(CART_STORAGE_KEY);
  console.log('✅ Cart cleared');
};

export default { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeCartItem, 
  clearCart 
};

