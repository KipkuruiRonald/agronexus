
// Serverless Dashboard Service
// Reads data from localStorage and Supabase-like local storage

export type Stat = {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: any;
  color: string;
};

const DASHBOARD_STORAGE_KEY = 'agronexus_dashboard_stats';

// Simulate dashboard data from localStorage and user context
export const getDashboardStats = async (): Promise<Stat[]> => {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
  
  const user = JSON.parse(localStorage.getItem('agronexus_user') || '{}');
  const cart = JSON.parse(localStorage.getItem('agronexus_cart') || '[]');
  const products = JSON.parse(localStorage.getItem('agronexus_products') || '[]');
  const tasks = JSON.parse(localStorage.getItem('agronexus_tasks') || '[]');
  
  // Import icons dynamically to avoid circular dependencies
  const { ShoppingCart, Leaf, Package, TrendingUp } = await import('lucide-react');
  
  return [
    {
      title: "Products Listed",
      value: products.length.toString(),
      change: "+2 this week",
      trend: "up",
      icon: Package,
      color: "bg-primary"
    },
    {
      title: "Cart Items",
      value: cart.reduce((sum: number, item: any) => sum + item.quantity, 0).toString(),
      change: "Active carts",
      trend: "up",
      icon: ShoppingCart,
      color: "bg-harvest"
    },
    {
      title: "Tasks Due",
      value: tasks.filter((t: any) => !t.completed).length.toString(),
      change: "This week",
      trend: "up",
      icon: Leaf,
      color: "bg-leaf"
    },
    {
      title: "Farm Health",
      value: "85%",
      change: "+5% this month",
      trend: "up",
      icon: TrendingUp,
      color: "bg-sky"
    }
  ];
};

export const getRecentOrders = async (): Promise<any[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const cart = JSON.parse(localStorage.getItem('agronexus_cart') || '[]');
  const user = JSON.parse(localStorage.getItem('agronexus_user') || '{}');
  
  // Convert cart items to order-like format for display
  return cart.slice(0, 5).map((item: any, index: number) => ({
    id: `ORD-${Date.now()}-${index}`,
    buyer: user.username || 'Guest',
    product: item.name,
    quantity: item.quantity,
    amount: `KES ${(item.price * item.quantity).toFixed(2)}`,
    status: 'pending'
  }));
};

export default { getDashboardStats, getRecentOrders };
