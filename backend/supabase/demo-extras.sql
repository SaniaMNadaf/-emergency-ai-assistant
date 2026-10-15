-- ============================================================
-- demo-extras.sql
-- Run this once in the Supabase SQL Editor after creating the
-- main tables and the nearby_responders RPC.
-- ============================================================

-- 1. Family can read incidents reported by patients they are linked to
DROP POLICY IF EXISTS "Family reads patient incidents" ON public.incidents;
CREATE POLICY "Family reads patient incidents"
ON public.incidents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.care_links cl
    WHERE cl.patient_id = incidents.reporter_id
      AND cl.family_id  = auth.uid()
      AND cl.active      = true
  )
);

-- 2. Return incident lat/lng (SECURITY INVOKER so RLS applies)
CREATE OR REPLACE FUNCTION public.incident_details(p_incident_id uuid)
RETURNS TABLE(lat double precision, lng double precision, has_photo boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    ST_Y(i.location::geometry)  AS lat,
    ST_X(i.location::geometry)  AS lng,
    i.has_photo,
    i.created_at
  FROM public.incidents i
  WHERE i.id = p_incident_id;
$$;

-- 3. Simulate a doctor accepting (SECURITY DEFINER skips RLS)
--    Only acknowledges broadcasts whose responder has user_id IS NULL (simulated/mock responder)
CREATE OR REPLACE FUNCTION public.demo_acknowledge(p_incident_id uuid, p_eta int)
RETURNS TABLE(broadcast_id uuid, responder_name text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_bid uuid;
  v_rid uuid;
  v_name text;
BEGIN
  SELECT b.id, b.responder_id
    INTO v_bid, v_rid
  FROM public.broadcasts b
  JOIN public.responders r ON r.id = b.responder_id
  WHERE b.incident_id = p_incident_id
    AND b.status = 'sent'
    AND r.user_id IS NULL
  ORDER BY b.sent_at ASC
  LIMIT 1;

  IF v_bid IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.broadcasts
     SET status          = 'acknowledged',
         acknowledged_at = now(),
         eta_minutes      = p_eta
   WHERE id = v_bid;

  UPDATE public.incidents
     SET status  = 'acknowledged',
         outcome = 'genuine'
   WHERE id = p_incident_id AND status = 'open';

  SELECT r.display_name INTO v_name
    FROM public.responders r WHERE r.id = v_rid;

  RETURN QUERY SELECT v_bid, v_name;
END;
$$;

-- 4. Reset all demo data (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.reset_demo()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.access_log;
  DELETE FROM public.broadcasts;
  DELETE FROM public.protocol_sessions;
  DELETE FROM public.incidents;
  DELETE FROM public.readings;
  DELETE FROM public.care_links;
  UPDATE public.responders SET available = true;
END;
$$;

-- 5. Storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-photos', 'incident-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth upload incident photos" ON storage.objects;
CREATE POLICY "Auth upload incident photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incident-photos');

DROP POLICY IF EXISTS "Auth read incident photos" ON storage.objects;
CREATE POLICY "Auth read incident photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'incident-photos');

-- 6. Link the demo doctor user to a responders row
DO $$
DECLARE
  v_uid uuid;
  v_lng double precision;
  v_lat double precision;
BEGIN
  SELECT id INTO v_uid FROM public.users WHERE email = 'doctor@demo.com';
  IF v_uid IS NULL THEN RAISE NOTICE 'doctor@demo.com user not found — skip'; RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.responders WHERE user_id = v_uid) THEN
    RAISE NOTICE 'Doctor responder row already exists — skip'; RETURN;
  END IF;

  SELECT ST_X(location::geometry), ST_Y(location::geometry)
    INTO v_lng, v_lat
  FROM public.responders
  LIMIT 1;

  IF v_lng IS NULL THEN
    v_lng := 73.8567;
    v_lat := 18.5204;
  END IF;

  INSERT INTO public.responders (user_id, display_name, kind, specialty, tier, available, location)
  VALUES (
    v_uid,
    'Dr. Sarah Chen',
    'doctor',
    'Emergency medicine',
    1,
    true,
    ST_SetSRID(ST_MakePoint(v_lng + 0.001, v_lat + 0.001), 4326)::geography
  );
END;
$$;
