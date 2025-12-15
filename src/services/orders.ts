import { Product } from './products';

export interface OrderItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  shipping_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const ORDERS_STORAGE_KEY = 'agronexus_orders';

// Helper function to get orders from localStorage
const getOrdersFromStorage = (): Order[] => {
  const orders = localStorage.getItem(ORDERS_STORAGE_KEY);
  return orders ? JSON.parse(orders) : [];
};

// Helper function to save orders to localStorage
const saveOrdersToStorage = (orders: Order[]): void => {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
};

// Helper function to simulate network delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const getOrders = async (): Promise<Order[]> => {
  await delay(300);
  return getOrdersFromStorage();
};

export const getOrder = async (id: string): Promise<Order | null> => {
  await delay(200);
  const orders = getOrdersFromStorage();
  return orders.find(order => order.id === id) || null;
};

export const createOrder = async (payload: {
  items: Array<{ product_id: string; quantity: number; price: number }>;
  payment_method?: string;
  shipping_address?: string;
  notes?: string;
}): Promise<Order> => {
  await delay(500);
  
  const orders = getOrdersFromStorage();
  const user = JSON.parse(localStorage.getItem('agronexus_user') || '{}');
  
  // Create order items with product data
  const orderItems: OrderItem[] = payload.items.map(item => ({
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price,
  }));
  
  // Calculate total amount
  const total_amount = payload.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const newOrder: Order = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    user_id: user.id || 'anonymous',
    items: orderItems,
    total_amount,
    status: 'pending',
    payment_status: 'pending',
    payment_method: payload.payment_method,
    shipping_address: payload.shipping_address,
    notes: payload.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  orders.push(newOrder);
  saveOrdersToStorage(orders);
  
  console.log('✅ Order created:', newOrder);
  return newOrder;
};

export const updateOrderStatus = async (id: string, status: Order['status']): Promise<Order> => {
  await delay(300);
  
  const orders = getOrdersFromStorage();
  const order = orders.find(order => order.id === id);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  order.status = status;
  order.updated_at = new Date().toISOString();
  
  saveOrdersToStorage(orders);
  console.log('✅ Order status updated:', order);
  return order;
};

export const updatePaymentStatus = async (id: string, payment_status: Order['payment_status']): Promise<Order> => {
  await delay(300);
  
  const orders = getOrdersFromStorage();
  const order = orders.find(order => order.id === id);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  order.payment_status = payment_status;
  order.updated_at = new Date().toISOString();
  
  saveOrdersToStorage(orders);
  console.log('✅ Payment status updated:', order);
  return order;
};

export const cancelOrder = async (id: string): Promise<Order> => {
  return updateOrderStatus(id, 'cancelled');
};

export const deleteOrder = async (id: string): Promise<void> => {
  await delay(200);
  
  const orders = getOrdersFromStorage();
  const index = orders.findIndex(order => order.id === id);
  
  if (index === -1) {
    throw new Error('Order not found');
  }
  
  orders.splice(index, 1);
  saveOrdersToStorage(orders);
  console.log('✅ Order deleted');
};

export default {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  deleteOrder,
};

