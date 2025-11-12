-- =====================================================
-- TEMPORARY WORKAROUND - Auto-assign roles via trigger
-- Use this ONLY if edge function isn't working
-- =====================================================

-- This will automatically assign 'employee' role to new users
-- You can then manually change them to vehicle_manager if needed

-- Step 1: Create the function
CREATE OR REPLACE FUNCTION auto_assign_employee_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wait a tiny bit to let edge function try first
  PERFORM pg_sleep(0.5);
  
  -- Only assign if user doesn't already have a role
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'employee'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Auto-assigned employee role to user %', NEW.id;
  END IF;
  
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
-- Test it: Create a user and check if role is assigned
-- =====================================================

-- After creating a user from admin dashboard, run this:
SELECT 
  p.email,
  p.full_name,
  ur.role,
  'Role assigned by trigger' as note
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC
LIMIT 5;

-- =====================================================
-- To change a user from employee to vehicle_manager:
-- =====================================================

UPDATE user_roles
SET role = 'vehicle_manager'::app_role
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'manager@example.com'
);

-- =====================================================
-- IMPORTANT: Remove this trigger once edge function works!
-- =====================================================

-- To remove the workaround later:
-- DROP TRIGGER IF EXISTS auto_assign_role_trigger ON profiles;
-- DROP FUNCTION IF EXISTS auto_assign_employee_role();
