-- =====================================================
-- FIX EXISTING USERS - Assign Roles to Users Without Them
-- =====================================================

-- Step 1: First, let's see all users without roles
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  '❌ NO ROLE ASSIGNED' as status
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- Step 2: Assign roles to existing users
-- =====================================================

-- OPTION A: If you know which users should be employees
-- Replace the email addresses with actual user emails
INSERT INTO user_roles (user_id, role)
SELECT id, 'employee'::app_role
FROM profiles
WHERE email IN (
  -- Add employee email addresses here, one per line:
  'employee1@example.com',
  'employee2@example.com'
  -- Add more as needed
)
AND id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================

-- OPTION B: If you know which users should be vehicle managers
-- Replace the email addresses with actual user emails
INSERT INTO user_roles (user_id, role)
SELECT id, 'vehicle_manager'::app_role
FROM profiles
WHERE email IN (
  -- Add vehicle manager email addresses here:
  'manager1@example.com'
  -- Add more as needed
)
AND id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================

-- OPTION C: Assign ALL users without roles as employees (quick fix)
-- Uncomment the lines below to use this option:

-- INSERT INTO user_roles (user_id, role)
-- SELECT p.id, 'employee'::app_role
-- FROM profiles p
-- LEFT JOIN user_roles ur ON p.id = ur.user_id
-- WHERE ur.role IS NULL
-- ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================

-- Step 3: Verify all users now have roles
SELECT 
  p.email,
  p.full_name,
  COALESCE(ur.role::text, '❌ STILL NO ROLE') as role,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ Will redirect to /admin/dashboard'
    WHEN ur.role = 'vehicle_manager' THEN '✅ Will redirect to /vehicle-manager/dashboard'
    WHEN ur.role = 'employee' THEN '✅ Will redirect to /employee/dashboard'
    ELSE '❌ LOGIN WILL FAIL'
  END as login_status
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;

-- =====================================================
-- IMPORTANT: After running this, test login again!
-- =====================================================
