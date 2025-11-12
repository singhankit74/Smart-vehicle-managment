# Quick SQL Reference - Useful Queries

## Create First Admin User

After creating a user via Supabase Dashboard, assign admin role:

```sql
-- Replace 'USER_EMAIL' with actual email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM profiles
WHERE email = 'admin@yourcompany.com';
```

## Check User Roles

```sql
-- View all users and their roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;
```

## Fix User Role (if needed)

```sql
-- Change a user's role
UPDATE user_roles
SET role = 'vehicle_manager'  -- or 'admin' or 'employee'
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'user@example.com'
);
```

## Add Role to Existing User

```sql
-- Add a role to a user who doesn't have one
INSERT INTO user_roles (user_id, role)
SELECT id, 'employee'::app_role
FROM profiles
WHERE email = 'user@example.com'
AND id NOT IN (SELECT user_id FROM user_roles);
```

## View All Vehicles

```sql
SELECT 
  name,
  number_plate,
  status,
  created_at
FROM vehicles
ORDER BY created_at DESC;
```

## View Trip Requests by Status

```sql
-- View pending requests
SELECT 
  tr.id,
  p.full_name as employee_name,
  v.name as vehicle_name,
  tr.destination,
  tr.purpose,
  tr.approval_status,
  tr.created_at
FROM trip_requests tr
JOIN profiles p ON tr.employee_id = p.id
JOIN vehicles v ON tr.vehicle_id = v.id
WHERE tr.approval_status = 'pending'
ORDER BY tr.created_at DESC;
```

## View Active Trips

```sql
SELECT 
  t.id,
  p.full_name as employee_name,
  v.name as vehicle_name,
  t.status,
  t.start_time,
  t.distance
FROM trips t
JOIN profiles p ON t.employee_id = p.id
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.status = 'active'
ORDER BY t.start_time DESC;
```

## Delete a User (and all related data)

```sql
-- This will cascade delete all related records
DELETE FROM auth.users
WHERE id = (
  SELECT id FROM profiles WHERE email = 'user@example.com'
);
```

## Reset User Password (via Dashboard)

Go to: Authentication → Users → Click on user → Reset Password

Or use SQL:
```sql
-- Note: This requires service role access
-- Better to use Dashboard for password resets
```

## Check Storage Usage

```sql
SELECT 
  COUNT(*) as total_photos,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'meter-photos';
```

## View Recent Activity

```sql
-- Recent trip requests
SELECT 
  'Trip Request' as activity_type,
  p.full_name as user_name,
  tr.destination as details,
  tr.created_at
FROM trip_requests tr
JOIN profiles p ON tr.employee_id = p.id
ORDER BY tr.created_at DESC
LIMIT 10;
```

## Database Statistics

```sql
-- Count records in each table
SELECT 
  'Profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Trip Requests', COUNT(*) FROM trip_requests
UNION ALL
SELECT 'Trips', COUNT(*) FROM trips
UNION ALL
SELECT 'User Roles', COUNT(*) FROM user_roles;
```

## Verify RLS Policies

```sql
-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_roles', 'vehicles', 'trip_requests', 'trips');
```

## Check Edge Functions

```sql
-- This is done via Supabase CLI or Dashboard
-- CLI: npx supabase functions list
-- Dashboard: Edge Functions section
```

## Backup Important Data

```sql
-- Export users and roles
COPY (
  SELECT 
    p.email,
    p.full_name,
    p.phone,
    ur.role
  FROM profiles p
  LEFT JOIN user_roles ur ON p.id = ur.user_id
) TO '/tmp/users_backup.csv' WITH CSV HEADER;
```

## Common Issues & Fixes

### Issue: User can't log in
```sql
-- Check if user exists and is confirmed
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### Issue: User has wrong permissions
```sql
-- Check user's role
SELECT 
  p.email,
  ur.role
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'user@example.com';
```

### Issue: Storage bucket not accessible
```sql
-- Check bucket configuration
SELECT 
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'meter-photos';
```

## Performance Queries

### Find slow queries (if needed)
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index usage
```sql
-- Check if indexes are being used
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Testing Queries

### Create test data
```sql
-- Insert a test vehicle
INSERT INTO vehicles (name, number_plate, description, status)
VALUES ('Test Vehicle', 'TEST-123', 'Test vehicle for development', 'available');

-- Note: Trip requests and trips should be created via the application
-- to ensure proper authentication and RLS policies
```

## Cleanup Queries

### Delete old completed trips (older than 90 days)
```sql
DELETE FROM trips
WHERE status = 'completed'
AND end_time < NOW() - INTERVAL '90 days';
```

### Archive old trip requests
```sql
-- First, ensure you have an archive table if needed
-- Then move old records
-- This is just an example - adjust based on your needs
```
