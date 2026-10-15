-- ============================================================
-- graph-extras.sql
-- Run this in the Supabase SQL Editor to expose responder
-- geography data as lat/lng numbers for the graph sync script.
-- ============================================================

-- Allow authenticated users (incl. anon key) to read responders
DROP POLICY IF EXISTS "Anyone reads responders" ON public.responders;
CREATE POLICY "Anyone reads responders"
ON public.responders FOR SELECT TO authenticated
USING (true);

-- SECURITY INVOKER: RLS applies to the calling user.
-- Returns geometry coordinates as numeric lat/lng instead of hex WKB.
CREATE OR REPLACE FUNCTION public.responders_geo()
RETURNS TABLE(
  id            uuid,
  display_name  text,
  kind          text,
  specialty     text,
  tier          integer,
  available     boolean,
  lat           double precision,
  lng           double precision
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    r.id,
    r.display_name,
    r.kind,
    r.specialty,
    r.tier,
    r.available,
    ST_Y(r.location::geometry) AS lat,
    ST_X(r.location::geometry) AS lng
  FROM public.responders r
  WHERE r.location IS NOT NULL;
$$;
