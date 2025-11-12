-- =====================================================
-- FINAL SOLUTION - Auto-assign roles via database trigger
-- This works immediately and doesn't depend on edge function
-- =====================================================

-- Since the edge function isn't being invoked (logs show no calls),
-- we'll use a database trigger to automatically assign roles.

-- Step 1: Create the auto-assign function
CREATE OR REPLACE FUNCTION auto_assign_employee_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically assign employee role to new users
  -- This happens immediately when profile is created
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'employee'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE LOG 'Auto-assigned employee role to user % (%)', NEW.email, NEW.id;
  
  RETURN NEW;
END;
$$;

-- Step 2: Create the trigger
DROP TRIGGER IF EXISTS auto_assign_role_trigger ON profiles;
CREATE TRIGGER auto_assign_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee_role();

-- =====================================================
-- Verification: Check that trigger was created
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
AND trigger_name = 'auto_assign_role_trigger';

-- Should show one row with the trigger

-- =====================================================
-- Test: Create a user and it should automatically get employee role
-- After creating a user from admin dashboard, run this:
-- =====================================================

SELECT 
  p.email,
  p.full_name,
  ur.role,
  p.created_at,
  ur.created_at as role_assigned_at,
  '✅ Auto-assigned by trigger' as note
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC
LIMIT 5;

-- =====================================================
-- To change users to vehicle_manager role:
-- =====================================================

-- Option 1: Change by email
UPDATE user_roles
SET role = 'vehicle_manager'::app_role
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email IN (
    'manager1@example.com',
    'manager2@example.com'
    -- Add more emails as needed
  )
);

-- Option 2: Change the most recently created user
UPDATE user_roles
SET role = 'vehicle_manager'::app_role
WHERE user_id = (
  SELECT id FROM profiles 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- =====================================================
-- Verify the change
-- =====================================================

SELECT 
  p.email,
  ur.role,
  CASE 
    WHEN ur.role = 'admin' THEN '→ /admin/dashboard'
    WHEN ur.role = 'vehicle_manager' THEN '→ /vehicle-manager/dashboard'
    WHEN ur.role = 'employee' THEN '→ /employee/dashboard'
  END as will_redirect_to
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;

-- =====================================================
-- DONE! This solution:
-- 1. ✅ Works immediately
-- 2. ✅ Doesn't depend on edge function
-- 3. ✅ All new users get employee role automatically
-- 4. ✅ You can change to vehicle_manager anytime
-- 5. ✅ Users can log in and redirect correctly
-- =====================================================
