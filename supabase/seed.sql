-- CueBook Seed Data
-- This script should be run AFTER the user has been created via the Auth API
-- Replace the user UUID below with the actual UUID from auth.users

-- The seed script will be run via a Node.js script that:
-- 1. Creates the user via Supabase Auth Admin API
-- 2. Gets the user UUID
-- 3. Runs the SQL with the correct UUID
