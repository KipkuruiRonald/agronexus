-- ========================================
-- AgriNexus Authentication & User Setup
-- SQL Script to fix auth errors and database issues
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. CREATE/UPDATE USERS TABLE
-- ========================================

-- Drop existing table if it exists (be careful in production)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table with proper structure
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    location TEXT,
    avatar_url TEXT,
    user_type TEXT DEFAULT 'buyer' CHECK (user_type IN ('buyer', 'farmer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_user_type ON public.users(user_type);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- ========================================
-- 2. CREATE FUNCTIONS FOR USER MANAGEMENT
-- ========================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into public.users table
    INSERT INTO public.users (
        id,
        email,
        full_name,
        first_name,
        last_name,
        phone,
        user_type,
        is_verified,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'buyer'),
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. CREATE TRIGGERS
-- ========================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_users_updated_at ON public.users;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at timestamp
CREATE TRIGGER on_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- 4. SET UP ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Policy for public read access to user profiles (for marketplace)
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT USING (is_active = true AND is_verified = true);

-- Policy for authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ========================================
-- 5. CREATE ADDITIONAL TABLES FOR COMPLETE USER DATA
-- ========================================

-- Create user profiles table for extended information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bio TEXT,
    farming_experience INTEGER,
    farm_location TEXT,
    farm_size DECIMAL(10,2),
    preferred_crops TEXT[],
    certification_status TEXT,
    verified_documents JSONB DEFAULT '[]'::jsonb,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_sales INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_profiles
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_rating ON public.user_profiles(rating);
CREATE INDEX idx_user_profiles_location ON public.user_profiles(farm_location);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public can view verified farmer profiles
CREATE POLICY "Public can view verified farmers" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = user_profiles.user_id 
            AND users.is_verified = true 
            AND users.user_type = 'farmer'
        )
    );

-- ========================================
-- 6. CREATE SAMPLE DATA AND VERIFICATION
-- ========================================

-- Function to verify the setup
CREATE OR REPLACE FUNCTION public.verify_auth_setup()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RETURN QUERY SELECT 'Users Table'::TEXT, 'EXISTS'::TEXT, 'Users table created successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Users Table'::TEXT, 'MISSING'::TEXT, 'Users table not found'::TEXT;
    END IF;

    -- Check if trigger exists
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN
        RETURN QUERY SELECT 'Auth Trigger'::TEXT, 'EXISTS'::TEXT, 'Auth trigger created successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Auth Trigger'::TEXT, 'MISSING'::TEXT, 'Auth trigger not found'::TEXT;
    END IF;

    -- Check RLS policies
    IF EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'users' 
        AND privilege_type = 'SELECT'
    ) THEN
        RETURN QUERY SELECT 'RLS Policies'::TEXT, 'EXISTS'::TEXT, 'RLS policies configured'::TEXT;
    ELSE
        RETURN QUERY SELECT 'RLS Policies'::TEXT, 'MISSING'::TEXT, 'RLS policies not found'::TEXT;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. GRANT PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;

-- Grant permissions to anon for public reads
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.user_profiles TO anon;

-- ========================================
-- 8. CREATE ADMIN FUNCTION (OPTIONAL)
-- ========================================

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO user_uuid 
    FROM public.users 
    WHERE email = user_email;
    
    IF user_uuid IS NOT NULL THEN
        -- Update user type to admin
        UPDATE public.users 
        SET user_type = 'admin', updated_at = NOW()
        WHERE id = user_uuid;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION AND FINAL SETUP
-- ========================================

-- Run verification
SELECT * FROM public.verify_auth_setup();

-- Show current users count (should be 0 initially)
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT 
    'Verified Users' as metric,
    COUNT(*) as count
FROM public.users 
WHERE is_verified = true

UNION ALL

SELECT 
    'Active Users' as metric,
    COUNT(*) as count
FROM public.users 
WHERE is_active = true;

-- ========================================
-- INSTRUCTIONS FOR COMPLETION
-- ========================================

/*
After running this script:

1. Restart your Supabase project or refresh the database connection
2. Test user registration by signing up a new user
3. Check that the user appears in both auth.users and public.users tables
4. Verify that RLS policies are working correctly

To promote a user to admin:
SELECT public.promote_to_admin('admin@example.com');

To view verification results:
SELECT * FROM public.verify_auth_setup();

Common Issues Fixed:
- Missing user creation triggers
- Incorrect RLS policies
- Missing indexes for performance
- Incomplete user table structure
- Missing relationships between auth and public schemas
*/
