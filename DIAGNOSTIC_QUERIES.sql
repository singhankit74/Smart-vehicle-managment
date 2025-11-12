-- =====================================================
-- DIAGNOSTIC QUERIES - Run these to debug login issues
-- =====================================================

-- Query 1: Check all users and their roles
-- This shows if roles are being assigned when users are created
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role,
  p.created_at as user_created,
  ur.created_at as role_assigned
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;

-- Expected: Each user should have a role (employee, vehicle_manager, or admin)
-- If role is NULL, the edge function isn't assigning roles

-- =====================================================

-- Query 2: Check RLS policies on user_roles table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Expected: Should see policy "Users can view their own roles"
-- If missing, users can't fetch their own roles

-- =====================================================

-- Query 3: Verify app_role enum has all 3 roles
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype
ORDER BY enumsortorder;

-- Expected: admin, vehicle_manager, employee
-- If only 2 values, the enum wasn't updated

-- =====================================================

-- Query 4: Find users without roles (these will fail to login)
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL
ORDER BY p.created_at DESC;

-- If this returns rows, those users need roles assigned

-- =====================================================

-- Query 5: Check if profiles are being created
SELECT 
  COUNT(*) as total_profiles,
  COUNT(DISTINCT id) as unique_profiles
FROM profiles;

-- Should match the number of users created

-- =====================================================

-- Query 6: Check auth.users vs profiles sync
SELECT 
  au.email as auth_email,
  p.email as profile_email,
  au.created_at as auth_created,
  p.created_at as profile_created,
  CASE 
    WHEN p.id IS NULL THEN 'PROFILE MISSING'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 20;

-- All users should have matching profiles

-- =====================================================

-- QUICK FIX: Assign roles to users who don't have them
-- Uncomment and modify the email addresses as needed

-- For employees:
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'employee'::app_role
-- FROM profiles
-- WHERE email IN ('employee1@example.com', 'employee2@example.com')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- For vehicle managers:
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'vehicle_manager'::app_role
-- FROM profiles
-- WHERE email IN ('manager1@example.com', 'manager2@example.com')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================

-- Query 7: Test RLS policy (run this to simulate user login)
-- Replace 'user@example.com' with actual user email
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM profiles WHERE email = 'user@example.com';
  
  RAISE NOTICE 'User ID: %', test_user_id;
  
  -- This simulates what happens when user logs in
  RAISE NOTICE 'Roles: %', (
    SELECT array_agg(role::text)
    FROM user_roles
    WHERE user_id = test_user_id
  );
END $$;

-- =====================================================

-- Query 8: Check storage bucket
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'meter-photos';

-- Should return one row

-- =====================================================

-- Query 9: Recent activity log
SELECT 
  'User Created' as event,
  email,
  created_at
FROM profiles
WHERE created_at > NOW() - INTERVAL '1 day'
UNION ALL
SELECT 
  'Role Assigned' as event,
  p.email,
  ur.created_at
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE ur.created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Shows recent user creation and role assignment activity

-- =====================================================

-- Query 10: Verify has_role function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'has_role';

-- Should return the has_role function definition

-- =====================================================
-- END OF DIAGNOSTIC QUERIES
-- =====================================================

-- SUMMARY OF WHAT TO CHECK:
-- 1. All users have roles assigned (Query 1)
-- 2. RLS policy exists (Query 2)
-- 3. Enum has 3 values (Query 3)
-- 4. No users without roles (Query 4)
-- 5. Profiles created for all auth users (Query 6)
