-- =====================================================
-- QUICK FIX: Allow NULL vehicle_id in trip_requests
-- Run this in Supabase SQL Editor NOW
-- =====================================================

-- This allows employees to submit trip requests without selecting a vehicle
-- Managers will assign vehicles later

ALTER TABLE trip_requests 
ALTER COLUMN vehicle_id DROP NOT NULL;

-- Verify the fix worked
SELECT 
  column_name,
  is_nullable,
  'Fixed! vehicle_id can now be NULL' as status
FROM information_schema.columns
WHERE table_name = 'trip_requests' 
  AND column_name = 'vehicle_id';

-- Expected result: is_nullable = 'YES'

-- =====================================================
-- Now you can test:
-- 1. Employee submits trip request (no vehicle selection)
-- 2. Request is created with vehicle_id = NULL
-- 3. Manager assigns vehicle later
-- =====================================================
