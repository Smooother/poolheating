-- Security improvement: Move extensions to dedicated schema
-- This prevents potential security issues with extensions in the public schema

-- Create a dedicated schema for extensions (if it doesn't exist)
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the pg_net extension out of the public schema
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- Ensure the extensions schema is in the search_path for service role
-- This allows the service role to access the extension functions
ALTER ROLE service_role SET search_path = extensions, public;

-- Optional: Grant usage on the extensions schema to service_role if needed
GRANT USAGE ON SCHEMA extensions TO service_role;

-- Note: This migration improves security by:
-- 1. Isolating extensions from the public schema
-- 2. Preventing potential privilege escalation through extension functions
-- 3. Following security best practices for PostgreSQL extensions
