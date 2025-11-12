-- Create user roles enum
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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "General managers can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'general_manager'));

CREATE POLICY "General managers can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'general_manager'));

-- RLS Policies for vehicles
CREATE POLICY "All authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "General managers can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'general_manager'));

-- RLS Policies for trip_requests
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

-- RLS Policies for trips
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

-- Create storage bucket for meter photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-photos', 'meter-photos', true);

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

-- Create function to handle new user signup
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

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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