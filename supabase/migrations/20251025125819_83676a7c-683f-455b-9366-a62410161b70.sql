-- Drop the trigger that auto-assigns employee role to all new users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- We'll handle role assignment in the application code during signup
-- This allows admins and vehicle managers to be properly assigned their roles
-- based on the special codes they provide during registration