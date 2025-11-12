# 🚨 FINAL CHECKLIST - Fix Login Issue NOW

## Problem
Users can't log in - showing "No role assigned. Please contact admin."

## Root Cause
Users exist in the database but have NO roles in the `user_roles` table.

## IMMEDIATE FIX (Do This Now!)

### Step 1: Run This SQL Query

Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/sql

Copy and paste this ENTIRE query and click **RUN**:

```sql
-- Assign employee role to ALL users who don't have a role
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'employee'::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify all users now have roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  '✅ CAN NOW LOGIN' as status
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;
```

**Expected Result:** You should see all users with roles assigned!

### Step 2: Change Specific Users to Vehicle Manager

If you need some users to be vehicle managers, run this (replace email addresses):

```sql
-- Update specific users to vehicle_manager
UPDATE user_roles
SET role = 'vehicle_manager'::app_role
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email IN (
    'manager@example.com'
    -- Add more emails here if needed
  )
);

-- Verify the change
SELECT email, role FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email IN ('manager@example.com');
```

### Step 3: Test Login

1. Try logging in with an employee user
2. Should redirect to `/employee/dashboard` ✅

3. Try logging in with a vehicle manager
4. Should redirect to `/vehicle-manager/dashboard` ✅

## If Still Not Working - Debug Steps

### Check 1: Verify Users Have Roles

```sql
-- This should return NO rows
SELECT email FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL;
```

If this returns any emails, those users don't have roles!

### Check 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in
4. Look for these messages:
   - "User logged in: [UUID]"
   - "Roles fetched: [...]"
   - "Role list: [...]"

**If you see "Roles fetched: []"** → User has no role (go back to Step 1)

### Check 3: Verify RLS Policy

```sql
-- Check if policy exists
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'user_roles' 
AND policyname = 'Users can view their own roles';
```

**If no results:** Run this to create the policy:

```sql
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
```

### Check 4: Test Direct Query

```sql
-- Replace with actual user email
SELECT 
  p.id,
  p.email,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'testuser@example.com';
```

This should show the user's role. If `role` is NULL, that's the problem!

## Complete Fix Script

I've created `EMERGENCY_FIX.sql` with all the queries you need. 

**To use it:**
1. Open the file
2. Copy everything
3. Paste in Supabase SQL Editor
4. Run it
5. Check the results

## Verification Commands

After running the fix, verify with these:

```sql
-- 1. Count users without roles (should be 0)
SELECT COUNT(*) as users_without_roles
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL;

-- 2. List all users with their roles
SELECT 
  p.email,
  ur.role,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ Admin Dashboard'
    WHEN ur.role = 'vehicle_manager' THEN '✅ Vehicle Manager Dashboard'
    WHEN ur.role = 'employee' THEN '✅ Employee Dashboard'
    ELSE '❌ NO ROLE'
  END as login_status
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;
```

## Expected Results

After running the emergency fix:

✅ All users have roles
✅ Employees can log in → redirect to `/employee/dashboard`
✅ Vehicle managers can log in → redirect to `/vehicle-manager/dashboard`
✅ Admins can log in → redirect to `/admin/dashboard`

## Still Having Issues?

If it's STILL not working after all this:

1. **Clear browser cache and cookies**
2. **Try in incognito/private window**
3. **Check these specific things:**

```sql
-- A. Check if user_roles table exists
SELECT * FROM user_roles LIMIT 1;

-- B. Check if app_role enum has correct values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype;
-- Should show: admin, vehicle_manager, employee

-- C. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';
-- rowsecurity should be 't' (true)
```

## Quick Summary

**What to do RIGHT NOW:**

1. ✅ Open Supabase SQL Editor
2. ✅ Run the INSERT query from Step 1
3. ✅ Verify all users have roles
4. ✅ Update specific users to vehicle_manager (Step 2)
5. ✅ Test login

**This WILL fix the issue!**
