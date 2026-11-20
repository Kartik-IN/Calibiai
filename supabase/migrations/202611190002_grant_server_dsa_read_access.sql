-- Allow the server-side Supabase client to perform the Phase 5 read-only check.
-- RLS remains enabled; this grants only SELECT on the required table.

grant select on table public.dsa_problems to service_role;
