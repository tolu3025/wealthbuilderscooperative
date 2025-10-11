-- Phase 1: Security & Authentication Foundation

-- 1.1 Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'state_rep', 'member');

-- 1.2 Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 1.3 Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 1.4 Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN address TEXT,
ADD COLUMN invite_code TEXT UNIQUE,
ADD COLUMN invited_by UUID REFERENCES public.profiles(id),
ADD COLUMN registration_status TEXT DEFAULT 'pending_payment',
ADD COLUMN registration_pin TEXT,
ADD COLUMN state_rep_id UUID REFERENCES public.profiles(id);

-- 1.5 Create function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- 1.6 Update RLS policies to use has_role function

-- Drop old policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policies using has_role
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update blog_posts RLS policies
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;

CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update commissions RLS policies
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;

CREATE POLICY "Admins can view all commissions"
ON public.commissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update contributions RLS policies
DROP POLICY IF EXISTS "Admins can view all contributions" ON public.contributions;

CREATE POLICY "Admins can view all contributions"
ON public.contributions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update dividends RLS policies
DROP POLICY IF EXISTS "Admins can view all dividends" ON public.dividends;

CREATE POLICY "Admins can view all dividends"
ON public.dividends
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update properties RLS policies
DROP POLICY IF EXISTS "Admins can manage properties" ON public.properties;

CREATE POLICY "Admins can manage properties"
ON public.properties
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 1.7 Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    state,
    invite_code,
    registration_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    public.generate_invite_code(),
    'pending_payment'
  );
  
  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1.8 Remove role column from profiles (migration for existing data)
-- First, migrate existing role data to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 
  CASE 
    WHEN role = 'admin' THEN 'admin'::public.app_role
    WHEN role = 'state_rep' THEN 'state_rep'::public.app_role
    ELSE 'member'::public.app_role
  END
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Now drop the role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;