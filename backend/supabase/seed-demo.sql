-- ============================================================
-- seed-demo.sql
-- Run this in the Supabase SQL Editor (as project owner / service_role)
-- Creates demo auth users, user records, 6 responders, one care link.
-- ============================================================

-- 1. Create auth users (requires elevated privileges)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at, role)
VALUES
  ('bystander@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated'),
  ('doctor@demo.com',    crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated'),
  ('family@demo.com',    crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated'),
  ('patient@demo.com',   crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert user records (join auth users by email)
INSERT INTO public.users (id, email, name, role)
SELECT id, email,
  CASE email
    WHEN 'bystander@demo.com' THEN 'Emergency Bystander'
    WHEN 'doctor@demo.com'    THEN 'Dr. Sarah Chen'
    WHEN 'family@demo.com'    THEN 'Family Member'
    WHEN 'patient@demo.com'  THEN 'Patient Demo'
  END,
  CASE email
    WHEN 'bystander@demo.com' THEN 'bystander'
    WHEN 'doctor@demo.com'    THEN 'doctor'
    WHEN 'family@demo.com'    THEN 'family'
    WHEN 'patient@demo.com'   THEN 'patient'
  END
FROM auth.users
WHERE email IN ('bystander@demo.com', 'doctor@demo.com', 'family@demo.com', 'patient@demo.com')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert 6 demo responders around Pune, India (lat ~18.52, lng ~73.85)
--    4 doctors/hospitals (Tier 1) + 2 ASHA community health workers (Tier 2)
WITH demo_point(lat double precision, lng double precision) AS (
  VALUES
    (18.5300, 73.8500),
    (18.5250, 73.8600),
    (18.5150, 73.8400),
    (18.5350, 73.8550),
    (18.5100, 73.8300),
    (18.5050, 73.8450)
),
existing AS (
  SELECT user_id FROM public.responders WHERE user_id = (SELECT id FROM public.users WHERE email = 'doctor@demo.com')
)
INSERT INTO public.responders (display_name, kind, specialty, tier, available, location)
SELECT
  CASE i
    WHEN 1 THEN 'Dr. Sarah Chen'
    WHEN 2 THEN 'Pune District Hospital'
    WHEN 3 THEN 'Apollo Hospitals'
    WHEN 4 THEN 'Medanta Hospital'
    WHEN 5 THEN 'ASHA Worker Rani'
    WHEN 6 THEN 'ASHA Worker Sita'
  END AS display_name,
  CASE i
    WHEN 1 THEN 'doctor'
    WHEN 2 THEN 'hospital'
    WHEN 3 THEN 'hospital'
    WHEN 4 THEN 'hospital'
    WHEN 5 THEN 'responder'
    WHEN 6 THEN 'responder'
  END AS kind,
  CASE i
    WHEN 1 THEN 'Emergency medicine'
    WHEN 2 THEN 'Emergency medicine'
    WHEN 3 THEN 'General surgery'
    WHEN 4 THEN 'Cardiology'
    WHEN 5 THEN 'Community health'
    WHEN 6 THEN 'Community health'
  END AS specialty,
  CASE i
    WHEN 1 THEN 1
    WHEN 2 THEN 1
    WHEN 3 THEN 1
    WHEN 4 THEN 1
    WHEN 5 THEN 2
    WHEN 6 THEN 2
  END AS tier,
  true AS available,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography AS location
FROM demo_point
WITH ORDINALITY AS t(lat, lng, i)
LEFT JOIN existing e ON false
ON CONFLICT (display_name) DO NOTHING;

-- 4. Create care_link: patient -> family
INSERT INTO public.care_links (patient_id, family_id, active, granted_at)
SELECT
  (SELECT id FROM public.users WHERE email = 'patient@demo.com'),
  (SELECT id FROM public.users WHERE email = 'family@demo.com'),
  true,
  now()
ON CONFLICT (patient_id, family_id) DO UPDATE
  SET active = true, granted_at = now(), revoked_at = NULL;

-- 5. Link the demo doctor user to a responders row (if needed)
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
    v_lng := 73.85;
    v_lat := 18.52;
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
