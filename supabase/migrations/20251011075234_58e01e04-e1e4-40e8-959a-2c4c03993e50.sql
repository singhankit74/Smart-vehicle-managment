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

-- Create new RLS policies

-- Admin policies
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

-- Vehicle Manager policies
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