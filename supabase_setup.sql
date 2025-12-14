-- Supabase Database Setup for AgroNexus
-- This script creates the PostgreSQL tables equivalent to the MongoDB collections

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    role VARCHAR(50) DEFAULT 'buyer', -- farmer, buyer, admin
    password_hash VARCHAR(255), -- for FastAPI auth
    avatar_url TEXT,
    bio TEXT,
    farm_name VARCHAR(255),
    farm_location TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- vegetables, fruits, grains, dairy, etc.
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'kg', -- kg, lbs, pieces, etc.
    farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    images TEXT[], -- array of image URLs
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, out_of_stock
    organic BOOLEAN DEFAULT false,
    harvest_date DATE,
    expiry_date DATE,
    weight_per_unit DECIMAL(8,2),
    tags TEXT[],
    nutritional_info JSONB,
    farming_practices TEXT,
    certifications TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    products JSONB NOT NULL, -- array of {product_id, quantity, price}
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_method VARCHAR(50), -- credit_card, bank_transfer, cash_on_delivery
    payment_transaction_id VARCHAR(255),
    shipping_address JSONB NOT NULL, -- {street, city, state, zip_code, country}
    shipping_cost DECIMAL(8,2) DEFAULT 0,
    tax_amount DECIMAL(8,2) DEFAULT 0,
    discount_amount DECIMAL(8,2) DEFAULT 0,
    notes TEXT,
    tracking_number VARCHAR(255),
    estimated_delivery DATE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create carts table
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    items JSONB DEFAULT '[]', -- array of {product_id, quantity, price, added_at}
    total DECIMAL(10,2) DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- farming, maintenance, harvest, planting, irrigation, etc.
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    location TEXT,
    weather_dependent BOOLEAN DEFAULT false,
    equipment_needed TEXT[],
    notes TEXT,
    recurring BOOLEAN DEFAULT false,
    recurring_pattern JSONB, -- {type: 'weekly', 'monthly', 'custom', interval: 1}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at 
    BEFORE UPDATE ON carts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- Uncomment the following lines to insert sample data

-- Insert sample users
INSERT INTO users (id, email, first_name, last_name, role, farm_name, farm_location, is_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'farmer1@agronexus.com', 'John', 'Smith', 'farmer', 'Green Valley Farm', 'California, USA', true),
('550e8400-e29b-41d4-a716-446655440002', 'farmer2@agronexus.com', 'Maria', 'Garcia', 'farmer', 'Sunrise Gardens', 'Texas, USA', true),
('550e8400-e29b-41d4-a716-446655440003', 'buyer1@agronexus.com', 'Alice', 'Johnson', 'buyer', NULL, NULL, false)
ON CONFLICT (email) DO NOTHING;

-- Insert sample products
INSERT INTO products (id, name, description, category, price, quantity, farmer_id, organic, harvest_date) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Organic Tomatoes', 'Fresh, vine-ripened organic tomatoes', 'vegetables', 4.99, 100, '550e8400-e29b-41d4-a716-446655440001', true, '2024-01-15'),
('660e8400-e29b-41d4-a716-446655440002', 'Sweet Corn', 'Fresh sweet corn harvested this week', 'vegetables', 2.99, 50, '550e8400-e29b-41d4-a716-446655440001', false, '2024-01-20'),
('660e8400-e29b-41d4-a716-446655440003', 'Organic Lettuce', 'Crisp organic lettuce heads', 'vegetables', 3.49, 75, '550e8400-e29b-41d4-a716-446655440002', true, '2024-01-18')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - customize based on your needs)

-- Users can read all profiles but only update their own
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Products are readable by everyone, writable by farmers
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Farmers can manage their products" ON products FOR ALL USING (
    farmer_id::text = auth.uid()::text
);

-- Orders are viewable by involved parties only
CREATE POLICY "Users can view their orders" ON orders FOR SELECT USING (
    buyer_id::text = auth.uid()::text OR farmer_id::text = auth.uid()::text
);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (
    buyer_id::text = auth.uid()::text
);
CREATE POLICY "Users can update their orders" ON orders FOR UPDATE USING (
    buyer_id::text = auth.uid()::text OR farmer_id::text = auth.uid()::text
);

-- Carts are private to each user
CREATE POLICY "Users can manage their cart" ON carts FOR ALL USING (
    user_id::text = auth.uid()::text
);

-- Tasks are private to each user
CREATE POLICY "Users can manage their tasks" ON tasks FOR ALL USING (
    user_id::text = auth.uid()::text
);

-- Create views for common queries
CREATE OR REPLACE VIEW farmer_products AS
SELECT 
    p.*,
    u.first_name,
    u.last_name,
    u.farm_name
FROM products p
JOIN users u ON p.farmer_id = u.id
WHERE p.status = 'active';

CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.*,
    buyer.first_name || ' ' || buyer.last_name as buyer_name,
    farmer.first_name || ' ' || farmer.last_name as farmer_name,
    farmer.farm_name
FROM orders o
JOIN users buyer ON o.buyer_id = buyer.id
JOIN users farmer ON o.farmer_id = farmer.id;

-- Success message
SELECT 'AgroNexus database setup completed successfully!' as status;
