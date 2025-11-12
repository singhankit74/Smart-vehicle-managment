-- Fix RLS update violations by adding explicit WITH CHECK policies for trip_requests
BEGIN;

-- Allow admins to update rows even when the new status is not 'pending'
CREATE POLICY "Admins can apply updates (CHECK)"
ON public.trip_requests
FOR UPDATE
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure employees can still update their own requests while pending (new row must still belong to them)
CREATE POLICY "Employees can update own requests (CHECK)"
ON public.trip_requests
FOR UPDATE
WITH CHECK (auth.uid() = employee_id);

-- Allow vehicle managers to update approved requests (e.g., assign vehicles)
CREATE POLICY "Vehicle managers can apply updates (CHECK)"
ON public.trip_requests
FOR UPDATE
WITH CHECK (public.has_role(auth.uid(), 'vehicle_manager'));

COMMIT;