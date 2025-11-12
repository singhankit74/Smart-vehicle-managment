-- =====================================================
-- COMPLETE DATABASE SETUP FOR TRIP WISE FLEET
-- Run this entire script in your new Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create Enums and Base Tables
-- =====================================================

-- Create user roles enum (initially with 2 roles, will be updated later)
CREATE TYPE public.app_role AS ENUM ('general_manager', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number_plate TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trip_requests table
CREATE TABLE public.trip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expected_time TIMESTAMP WITH TIME ZONE NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.trip_requests(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  start_meter_photo TEXT,
  end_meter_photo TEXT,
  start_reading DECIMAL(10, 2),
  end_reading DECIMAL(10, 2),
  distance DECIMAL(10, 2),
  start_location_lat DECIMAL(10, 8),
  start_location_lng DECIMAL(10, 8),
  end_location_lat DECIMAL(10, 8),
  end_location_lng DECIMAL(10, 8),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Enable Row Level Security
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create Helper Functions
-- =====================================================

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: Create Triggers
-- =====================================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add update triggers for timestamp
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_requests_updated_at
  BEFORE UPDATE ON public.trip_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 5: Create RLS Policies for Profiles
-- =====================================================

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- STEP 6: Create RLS Policies for User Roles
-- =====================================================

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "General managers can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'general_manager'));

CREATE POLICY "General managers can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'general_manager'));

-- =====================================================
-- STEP 7: Create RLS Policies for Vehicles
-- =====================================================

CREATE POLICY "All authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "General managers can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'general_manager'));

-- =====================================================
-- STEP 8: Create RLS Policies for Trip Requests
-- =====================================================

CREATE POLICY "Employees can view own requests"
  ON public.trip_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "General managers can view all requests"
  ON public.trip_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'general_manager'));

CREATE POLICY "Employees can create requests"
  ON public.trip_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own pending requests"
  ON public.trip_requests FOR UPDATE
  USING (auth.uid() = employee_id AND approval_status = 'pending');

CREATE POLICY "General managers can update all requests"
  ON public.trip_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'general_manager'));

-- =====================================================
-- STEP 9: Create RLS Policies for Trips
-- =====================================================

CREATE POLICY "Employees can view own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "General managers can view all trips"
  ON public.trips FOR SELECT
  USING (public.has_role(auth.uid(), 'general_manager'));

CREATE POLICY "Employees can create trips for approved requests"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = employee_id);

-- =====================================================
-- STEP 10: Create Storage Bucket and Policies
-- =====================================================

-- Create storage bucket for meter photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-photos', 'meter-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload meter photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meter-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view meter photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meter-photos');

CREATE POLICY "Users can update their own meter photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'meter-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- STEP 11: Update Enum to Support 3 Roles (Admin, Vehicle Manager, Employee)
-- =====================================================

-- Drop all policies that depend on the old enum
DROP POLICY IF EXISTS "General managers can view all roles" ON user_roles;
DROP POLICY IF EXISTS "General managers can manage roles" ON user_roles;
DROP POLICY IF EXISTS "General managers can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "General managers can view all requests" ON trip_requests;
DROP POLICY IF EXISTS "General managers can update all requests" ON trip_requests;
DROP POLICY IF EXISTS "General managers can view all trips" ON trips;

-- Drop the has_role function
DROP FUNCTION IF EXISTS has_role(uuid, app_role);

-- Update the app_role enum to support 3 roles
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('admin', 'vehicle_manager', 'employee');

-- Temporarily disable RLS
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Update the user_roles table to use the new enum
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING 
  CASE 
    WHEN role::text = 'general_manager' THEN 'admin'::app_role
    WHEN role::text = 'employee' THEN 'employee'::app_role
    ELSE 'employee'::app_role
  END;

-- Drop the old enum
DROP TYPE app_role_old CASCADE;

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Recreate has_role function with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Add assigned_by column to trip_requests
ALTER TABLE trip_requests ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES profiles(id);

-- Update approval_status constraint
ALTER TABLE trip_requests DROP CONSTRAINT IF EXISTS trip_requests_approval_status_check;
ALTER TABLE trip_requests ADD CONSTRAINT trip_requests_approval_status_check 
  CHECK (approval_status IN ('pending', 'approved', 'assigned', 'rejected'));

-- =====================================================
-- STEP 12: Create New RLS Policies for Admin Role
-- =====================================================

CREATE POLICY "Admins can view all requests" ON trip_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can approve/reject requests" ON trip_requests
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') AND 
    approval_status = 'pending'
  );

CREATE POLICY "Admins can view all trips" ON trips
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage vehicles" ON vehicles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- STEP 13: Create RLS Policies for Vehicle Manager Role
-- =====================================================

CREATE POLICY "Vehicle managers can view approved requests" ON trip_requests
  FOR SELECT USING (
    has_role(auth.uid(), 'vehicle_manager') AND 
    approval_status IN ('approved', 'assigned')
  );

CREATE POLICY "Vehicle managers can assign vehicles" ON trip_requests
  FOR UPDATE USING (
    has_role(auth.uid(), 'vehicle_manager') AND 
    approval_status = 'approved'
  );

CREATE POLICY "Vehicle managers can view all trips" ON trips
  FOR SELECT USING (has_role(auth.uid(), 'vehicle_manager'));

CREATE POLICY "Vehicle managers can manage vehicles" ON vehicles
  FOR ALL USING (has_role(auth.uid(), 'vehicle_manager'));

-- =====================================================
-- STEP 14: Fix RLS Update Violations with WITH CHECK Policies
-- =====================================================

-- Allow admins to update rows even when the new status is not 'pending'
CREATE POLICY "Admins can apply updates (CHECK)"
ON public.trip_requests
FOR UPDATE
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure employees can still update their own requests while pending
CREATE POLICY "Employees can update own requests (CHECK)"
ON public.trip_requests
FOR UPDATE
WITH CHECK (auth.uid() = employee_id);

-- Allow vehicle managers to update approved requests
CREATE POLICY "Vehicle managers can apply updates (CHECK)"
ON public.trip_requests
FOR UPDATE
WITH CHECK (public.has_role(auth.uid(), 'vehicle_manager'));

-- =====================================================
-- STEP 15: Drop Auto-Assign Role Trigger (IMPORTANT FIX)
-- =====================================================

-- Drop the trigger that auto-assigns employee role to all new users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- NOTE: Role assignment will be handled explicitly by the create-user edge function
-- This prevents the bug where vehicle managers were getting employee role

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Next steps:
-- 1. Deploy the create-user edge function
-- 2. Create your first admin user manually (see instructions below)
