# 🚨 IMMEDIATE FIX - No Role Assigned Error

## Problem
Users are created but have no roles assigned, so they can't log in.

## Root Cause
The edge function that creates users isn't deployed or isn't working properly.

## Quick Fix (5 minutes)

### Step 1: Find Users Without Roles

Go to Supabase SQL Editor and run:

```sql
SELECT 
  p.email,
  p.full_name,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL
ORDER BY p.created_at DESC;
```

This shows all users who can't log in.

### Step 2: Assign Roles to Existing Users

**Option A - Assign specific roles:**

```sql
-- For employees (replace with actual email addresses)
INSERT INTO user_roles (user_id, role)
SELECT id, 'employee'::app_role
FROM profiles
WHERE email IN (
  'user1@example.com',
  'user2@example.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- For vehicle managers (replace with actual email addresses)
INSERT INTO user_roles (user_id, role)
SELECT id, 'vehicle_manager'::app_role
FROM profiles
WHERE email IN (
  'manager@example.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

**Option B - Quick fix (assign all as employees):**

```sql
-- Assign employee role to ALL users without roles
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'employee'::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 3: Verify Fix

```sql
-- Check all users now have roles
SELECT 
  p.email,
  ur.role,
  'Should work now!' as status
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;
```

All users should now have a role!

### Step 4: Test Login

1. Try logging in with one of the users
2. Should now redirect to correct dashboard
3. ✅ Success!

## Fix for Future Users

To prevent this issue for new users, deploy the edge function:

```bash
# In your terminal:
cd c:\Users\ankit\Downloads\trip-wise-fleet-main\trip-wise-fleet-main

# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref hptzvzkfafastxptmqxb

# Deploy the edge function
npx supabase functions deploy create-user
```

**Important:** After deploying, you also need to set the service role key:

1. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/settings/api
2. Copy the `service_role` key (the secret one)
3. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/functions
4. Click on `create-user` function
5. Go to Settings/Secrets tab
6. Add secret: `SUPABASE_SERVICE_ROLE_KEY` = [paste the key]

## Test Creating New User

After deploying edge function:

1. Log in as admin
2. Create a new test user
3. Check if role was assigned:

```sql
SELECT p.email, ur.role 
FROM profiles p 
LEFT JOIN user_roles ur ON p.id = ur.user_id 
WHERE p.email = 'testuser@example.com';
```

4. If role is assigned ✅ - Edge function is working!
5. If role is NULL ❌ - Check edge function logs

## Edge Function Logs

To check if edge function is working:

1. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/functions
2. Click on `create-user`
3. Click on Logs tab
4. Look for errors or "Role assigned successfully" messages

## Summary

**Immediate fix:** Run Step 2 SQL to assign roles to existing users

**Long-term fix:** Deploy edge function and set service role key

**Verify:** All users should now be able to log in and redirect correctly!
