-- Drop the trigger that auto-assigns employee role
-- This trigger was causing all users to get employee role regardless of their intended role
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Drop the function as well since it's no longer needed
DROP FUNCTION IF EXISTS public.assign_default_role();

-- The create-user edge function will handle role assignment explicitly
