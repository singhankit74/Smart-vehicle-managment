-- =====================================================
-- EMERGENCY FIX - Assign Roles to ALL Users Immediately
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Step 1: Check current situation
-- This shows ALL users and whether they have roles
SELECT 
  p.id,
  p.email,
  p.full_name,
  COALESCE(ur.role::text, '❌ NO ROLE') as current_role,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;

-- =====================================================
-- Step 2: ASSIGN ROLES TO ALL USERS WITHOUT ROLES
-- This will assign 'employee' role to everyone who doesn't have a role
-- =====================================================

INSERT INTO user_roles (user_id, role)
SELECT p.id, 'employee'::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- Step 3: Verify - ALL users should now have roles
-- =====================================================

SELECT 
  p.email,
  p.full_name,
  ur.role,
  '✅ CAN NOW LOGIN' as status
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;

-- =====================================================
-- Step 4: If you need to change specific users to vehicle_manager
-- Replace the email addresses with actual vehicle manager emails
-- =====================================================

-- First, remove employee role from vehicle managers
DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email IN (
    'manager1@example.com',
    'manager2@example.com'
  )
);

-- Then add vehicle_manager role
INSERT INTO user_roles (user_id, role)
SELECT id, 'vehicle_manager'::app_role
FROM profiles
WHERE email IN (
  'manager1@example.com',
  'manager2@example.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- Step 5: FINAL VERIFICATION
-- This should show all users with their correct roles
-- =====================================================

SELECT 
  p.email,
  p.full_name,
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
-- DONE! Now try logging in with any user
-- =====================================================
