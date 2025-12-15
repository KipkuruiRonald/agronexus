// Real Data Products Service - Supabase Integration
// Replace src/services/products.ts with this version


import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  unit: string;
  farmer_id?: string;
  farmer_name?: string;
  available_quantity?: number;
  rating?: number;
  total_reviews?: number;
  is_organic?: boolean;
  image_url?: string;
  video_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  organic?: boolean;
  farmer_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all products with optional filtering
 */
export const getProducts = async (filters?: ProductFilters): Promise<Product[]> => {
  try {
    console.log('[Real API] Fetching products with filters:', filters);
    

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters?.organic === true) {
      query = query.eq('is_organic', true);
    }

    if (filters?.farmer_id) {
      query = query.eq('farmer_id', filters.farmer_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Real API] Supabase error:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    console.log(`[Real API] Successfully fetched ${data?.length || 0} products`);
    return data || [];
  } catch (error) {
    console.error('[Real API] Error fetching products:', error);
    
    // Fallback to mock data if API fails
    console.log('[Real API] Falling back to mock data');
    return getMockProducts(filters);
  }
};

/**
 * Get a single product by ID
 */
export const getProduct = async (id: string): Promise<Product | null> => {
  try {
    console.log('[Real API] Fetching product:', id);


    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[Real API] Product not found:', id);
        return null;
      }
      throw error;
    }

    console.log('[Real API] Product fetched successfully:', data?.name);
    return data;
  } catch (error) {
    console.error('[Real API] Error fetching product:', error);
    
    // Fallback to mock data
    return getMockProduct(id);
  }
};

/**
 * Create a new product
 */
export const createProduct = async (payload: Partial<Product>): Promise<Product> => {
  try {
    console.log('[Real API] Creating product:', payload.name);

    // Get current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User must be authenticated to create products');
    }

    const productData = {
      name: payload.name || 'New Product',
      description: payload.description || '',
      category: payload.category || 'General',
      price: payload.price || 0,
      unit: payload.unit || 'unit',
      farmer_id: user.id,
      farmer_name: payload.farmer_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      available_quantity: payload.available_quantity || 0,
      is_organic: payload.is_organic || false,
      image_url: payload.image_url || '/assets/hero-farm.jpg',
      video_url: payload.video_url,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[Real API] Product created successfully:', data?.name);
    return data;
  } catch (error) {
    console.error('[Real API] Error creating product:', error);
    throw new Error(`Failed to create product: ${error.message}`);
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (id: string, payload: Partial<Product>): Promise<Product> => {
  try {
    console.log('[Real API] Updating product:', id);

    // Check if user owns this product
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User must be authenticated');
    }

    // Verify ownership
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('farmer_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      throw new Error('Product not found');
    }

    if (existingProduct.farmer_id !== user.id) {
      throw new Error('You can only update your own products');
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[Real API] Product updated successfully:', data?.name);
    return data;
  } catch (error) {
    console.error('[Real API] Error updating product:', error);
    throw new Error(`Failed to update product: ${error.message}`);
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    console.log('[Real API] Deleting product:', id);

    // Check if user owns this product
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User must be authenticated');
    }

    // Verify ownership
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('farmer_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      throw new Error('Product not found');
    }

    if (existingProduct.farmer_id !== user.id) {
      throw new Error('You can only delete your own products');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('[Real API] Product deleted successfully:', id);
  } catch (error) {
    console.error('[Real API] Error deleting product:', error);
    throw new Error(`Failed to delete product: ${error.message}`);
  }
};

/**
 * Get products by farmer ID
 */
export const getProductsByFarmer = async (farmerId: string): Promise<Product[]> => {
  try {
    console.log('[Real API] Fetching products for farmer:', farmerId);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`[Real API] Fetched ${data?.length || 0} products for farmer`);
    return data || [];
  } catch (error) {
    console.error('[Real API] Error fetching farmer products:', error);
    return [];
  }
};

/**
 * Get available categories
 */
export const getCategories = async (): Promise<string[]> => {
  try {
    console.log('[Real API] Fetching categories');

    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      throw error;
    }


    const categories = [...new Set(data?.map(item => item.category as string).filter(Boolean))];
    console.log(`[Real API] Found ${categories.length} categories`);
    return categories.sort();
  } catch (error) {
    console.error('[Real API] Error fetching categories:', error);
    return [];
  }
};

/**
 * Search products with advanced filters
 */
export const searchProducts = async (
  searchTerm: string,
  filters?: Omit<ProductFilters, 'search'>
): Promise<Product[]> => {
  try {
    console.log('[Real API] Searching products:', searchTerm);

    const searchFilters = {
      ...filters,
      search: searchTerm,
    };

    return await getProducts(searchFilters);
  } catch (error) {
    console.error('[Real API] Error searching products:', error);
    return [];
  }
};

// Fallback mock data functions (used when API is unavailable)
const getMockProducts = (filters?: ProductFilters): Product[] => {
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Fresh Organic Tomatoes',
      description: 'Premium quality organic tomatoes grown using sustainable farming practices',
      category: 'Vegetables',
      price: 4.50,
      unit: 'kg',
      farmer_id: 'farmer_1',
      farmer_name: 'Green Valley Farm',
      available_quantity: 50,
      rating: 4.5,
      total_reviews: 23,
      is_organic: true,
      image_url: '/assets/hero-farm.jpg',
      created_at: '2024-01-15T08:00:00Z',
    },
    {
      id: '2',
      name: 'Sweet Corn',
      description: 'Fresh sweet corn harvested daily from our local farms',
      category: 'Vegetables',
      price: 2.00,
      unit: 'piece',
      farmer_id: 'farmer_2',
      farmer_name: 'Sunshine Farm',
      available_quantity: 100,
      rating: 4.3,
      total_reviews: 15,
      is_organic: false,
      image_url: '/assets/hero-farm.jpg',
      created_at: '2024-01-16T09:00:00Z',
    },
  ];

  // Apply basic filtering
  let filtered = mockProducts;
  if (filters?.category) {
    filtered = filtered.filter(p => p.category?.toLowerCase() === filters.category?.toLowerCase());
  }
  if (filters?.organic === true) {
    filtered = filtered.filter(p => p.is_organic);
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.description?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

const getMockProduct = (id: string): Product | null => {
  const mockProducts = getMockProducts();
  return mockProducts.find(p => p.id === id) || null;
};

export default {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByFarmer,
  getCategories,
  searchProducts,
};
