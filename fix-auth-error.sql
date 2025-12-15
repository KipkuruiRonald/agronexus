DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'buyer')::user_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
GRANT ALL ON public.users TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Allow authenticated users all operations" ON public.users
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.users
    FOR SELECT 
    TO anon 
    USING (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT NOW();
