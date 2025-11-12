-- =====================================================
-- Allow NULL vehicle_id in trip_requests
-- This allows employees to submit requests without selecting a vehicle
-- Vehicle managers will assign vehicles later
-- =====================================================

-- Step 1: Make vehicle_id nullable in trip_requests table
ALTER TABLE trip_requests 
ALTER COLUMN vehicle_id DROP NOT NULL;

-- Step 2: Add a comment to document the change
COMMENT ON COLUMN trip_requests.vehicle_id IS 'Vehicle ID - can be null when request is created, assigned by manager later';

-- Step 3: Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'trip_requests' 
  AND column_name = 'vehicle_id';

-- Expected result: is_nullable should be 'YES'
