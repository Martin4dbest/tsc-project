-- TSC Safety Protection Foundation
-- Shared database foundation for Web, Android and iOS.
-- Reuses existing journeys, journey GPS and emergency operations.

-- =========================================================
-- 1. UPDATED_AT HANDLING
-- =========================================================

CREATE OR REPLACE FUNCTION public.tsc_safety_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 2. TRAVELLER SAFETY PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_safety_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  blood_group text,
  medical_conditions text,
  allergies text,
  medications text,
  accessibility_needs text,
  additional_information text,

  preferred_language text NOT NULL DEFAULT 'en',
  preferred_notification_channel text NOT NULL DEFAULT 'in_app'
    CHECK (preferred_notification_channel IN ('in_app', 'email', 'sms', 'push')),

  share_safety_information_with_responders boolean NOT NULL DEFAULT true,
  profile_completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tsc_safety_profiles_traveller_idx
  ON public.tsc_safety_profiles(traveller_id);

-- =========================================================
-- 3. EMERGENCY CONTACTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_safety_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  contact_name text NOT NULL CHECK (length(trim(contact_name)) BETWEEN 2 AND 150),
  relationship text,
  phone_number text NOT NULL CHECK (length(trim(phone_number)) BETWEEN 3 AND 30),
  email text,
  country_code text,

  is_primary boolean NOT NULL DEFAULT false,
  can_receive_emergency_notifications boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (id, traveller_id)
);

CREATE INDEX IF NOT EXISTS tsc_safety_contacts_traveller_idx
  ON public.tsc_safety_contacts(traveller_id);

CREATE UNIQUE INDEX IF NOT EXISTS tsc_safety_contacts_one_primary_idx
  ON public.tsc_safety_contacts(traveller_id)
  WHERE is_primary = true;

-- =========================================================
-- 4. GEOGRAPHICAL RISK ZONES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_safety_risk_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  zone_name text NOT NULL CHECK (length(trim(zone_name)) BETWEEN 2 AND 180),
  description text,

  zone_type text NOT NULL
    CHECK (zone_type IN (
      'restricted',
      'hazardous',
      'high_risk',
      'security',
      'natural_disaster',
      'transport',
      'other'
    )),

  severity text NOT NULL DEFAULT 'moderate'
    CHECK (severity IN ('low', 'moderate', 'high', 'critical')),

  country_code text,
  country_name text,
  region text,
  city text,
  address text,

  latitude numeric(10,7) NOT NULL
    CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(10,7) NOT NULL
    CHECK (longitude BETWEEN -180 AND 180),
  radius_meters integer NOT NULL DEFAULT 1000
    CHECK (radius_meters BETWEEN 50 AND 100000),

  guidance text,
  source_name text,
  source_reference text,

  starts_at timestamptz,
  expires_at timestamptz,

  is_active boolean NOT NULL DEFAULT true,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS tsc_safety_risk_zones_active_idx
  ON public.tsc_safety_risk_zones(is_active, severity);

CREATE INDEX IF NOT EXISTS tsc_safety_risk_zones_country_idx
  ON public.tsc_safety_risk_zones(country_code, region, city);

-- =========================================================
-- 5. JOURNEY RISK ASSESSMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_journey_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  traveller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  risk_level text NOT NULL DEFAULT 'unknown'
    CHECK (risk_level IN ('unknown', 'low', 'moderate', 'high', 'critical')),

  risk_score numeric(6,2)
    CHECK (risk_score IS NULL OR risk_score BETWEEN 0 AND 100),

  assessment_status text NOT NULL DEFAULT 'pending'
    CHECK (assessment_status IN ('pending', 'completed', 'failed')),

  assessment_summary text,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,

  assessed_at timestamptz,
  next_assessment_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (journey_id, id)
);

CREATE INDEX IF NOT EXISTS tsc_journey_risk_assessments_journey_idx
  ON public.tsc_journey_risk_assessments(journey_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS tsc_journey_risk_assessments_traveller_idx
  ON public.tsc_journey_risk_assessments(traveller_id, created_at DESC);

-- Individual zones identified during a journey assessment.

CREATE TABLE IF NOT EXISTS public.tsc_journey_risk_zone_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  assessment_id uuid NOT NULL
    REFERENCES public.tsc_journey_risk_assessments(id) ON DELETE CASCADE,

  risk_zone_id uuid NOT NULL
    REFERENCES public.tsc_safety_risk_zones(id) ON DELETE RESTRICT,

  distance_meters numeric(12,2),
  match_details jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (assessment_id, risk_zone_id)
);

CREATE INDEX IF NOT EXISTS tsc_journey_risk_zone_matches_assessment_idx
  ON public.tsc_journey_risk_zone_matches(assessment_id);

-- =========================================================
-- 6. SCHEDULED SAFETY CHECK-INS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_safety_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  traveller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,

  scheduled_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',

  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN (
      'scheduled',
      'confirmed',
      'missed',
      'cancelled',
      'escalated'
    )),

  confirmed_at timestamptz,
  missed_at timestamptz,
  escalated_at timestamptz,

  reminder_sent_at timestamptz,
  escalation_attempts integer NOT NULL DEFAULT 0
    CHECK (escalation_attempts >= 0),

  traveller_message text,
  location_latitude numeric(10,7)
    CHECK (location_latitude IS NULL OR location_latitude BETWEEN -90 AND 90),
  location_longitude numeric(10,7)
    CHECK (location_longitude IS NULL OR location_longitude BETWEEN -180 AND 180),

  emergency_alert_id uuid
    REFERENCES public.emergency_alerts(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tsc_safety_checkins_traveller_idx
  ON public.tsc_safety_checkins(traveller_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS tsc_safety_checkins_due_idx
  ON public.tsc_safety_checkins(status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS tsc_safety_checkins_journey_idx
  ON public.tsc_safety_checkins(journey_id, scheduled_at DESC);

-- =========================================================
-- 7. SAFETY ALERTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_safety_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  traveller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,

  risk_zone_id uuid
    REFERENCES public.tsc_safety_risk_zones(id) ON DELETE SET NULL,

  assessment_id uuid
    REFERENCES public.tsc_journey_risk_assessments(id) ON DELETE SET NULL,

  checkin_id uuid
    REFERENCES public.tsc_safety_checkins(id) ON DELETE SET NULL,

  emergency_alert_id uuid
    REFERENCES public.emergency_alerts(id) ON DELETE SET NULL,

  alert_type text NOT NULL
    CHECK (alert_type IN (
      'risk_zone',
      'journey_risk',
      'missed_checkin',
      'protection',
      'weather',
      'security',
      'system',
      'other'
    )),

  severity text NOT NULL DEFAULT 'moderate'
    CHECK (severity IN ('low', 'moderate', 'high', 'critical')),

  title text NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 200),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 2 AND 5000),

  status text NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read', 'acknowledged', 'resolved')),

  notification_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  notification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  acknowledged_at timestamptz,
  resolved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tsc_safety_alerts_traveller_idx
  ON public.tsc_safety_alerts(traveller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tsc_safety_alerts_status_idx
  ON public.tsc_safety_alerts(status, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS tsc_safety_alerts_journey_idx
  ON public.tsc_safety_alerts(journey_id, created_at DESC);

-- =========================================================
-- 8. ADMIN-CONFIGURABLE PROTECTION COVERAGE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_protection_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  setting_name text NOT NULL DEFAULT 'Default protection configuration',

  is_enabled boolean NOT NULL DEFAULT false,

  currency_code text NOT NULL DEFAULT 'NGN'
    CHECK (currency_code ~ '^[A-Z]{3}$'),

  base_fee numeric(14,2) NOT NULL DEFAULT 0
    CHECK (base_fee >= 0),

  rate_per_kilometre numeric(14,4) NOT NULL DEFAULT 0
    CHECK (rate_per_kilometre >= 0),

  minimum_charge numeric(14,2) NOT NULL DEFAULT 0
    CHECK (minimum_charge >= 0),

  maximum_charge numeric(14,2)
    CHECK (maximum_charge IS NULL OR maximum_charge >= minimum_charge),

  minimum_distance_km numeric(12,3) NOT NULL DEFAULT 0
    CHECK (minimum_distance_km >= 0),

  maximum_distance_km numeric(12,3)
    CHECK (
      maximum_distance_km IS NULL
      OR maximum_distance_km >= minimum_distance_km
    ),

  coverage_limit numeric(14,2) NOT NULL DEFAULT 0
    CHECK (coverage_limit >= 0),

  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  protection_rules jsonb NOT NULL DEFAULT '{}'::jsonb,

  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE INDEX IF NOT EXISTS tsc_protection_settings_active_idx
  ON public.tsc_protection_settings(is_enabled, effective_from DESC);

-- One protection calculation record per journey and configuration.

CREATE TABLE IF NOT EXISTS public.tsc_journey_protection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  traveller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  settings_id uuid REFERENCES public.tsc_protection_settings(id) ON DELETE SET NULL,

  eligibility_status text NOT NULL DEFAULT 'pending'
    CHECK (eligibility_status IN (
      'pending',
      'eligible',
      'ineligible',
      'requires_review'
    )),

  coverage_status text NOT NULL DEFAULT 'not_enrolled'
    CHECK (coverage_status IN (
      'not_enrolled',
      'quoted',
      'pending_payment',
      'active',
      'expired',
      'cancelled',
      'declined'
    )),

  distance_km numeric(12,3)
    CHECK (distance_km IS NULL OR distance_km >= 0),

  currency_code text NOT NULL DEFAULT 'NGN'
    CHECK (currency_code ~ '^[A-Z]{3}$'),

  base_fee numeric(14,2) NOT NULL DEFAULT 0
    CHECK (base_fee >= 0),

  rate_per_kilometre numeric(14,4) NOT NULL DEFAULT 0
    CHECK (rate_per_kilometre >= 0),

  calculated_amount numeric(14,2)
    CHECK (calculated_amount IS NULL OR calculated_amount >= 0),

  coverage_limit numeric(14,2)
    CHECK (coverage_limit IS NULL OR coverage_limit >= 0),

  eligibility_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculation_details jsonb NOT NULL DEFAULT '{}'::jsonb,

  quoted_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (journey_id),

  CHECK (expires_at IS NULL OR activated_at IS NULL OR expires_at > activated_at)
);

CREATE INDEX IF NOT EXISTS tsc_journey_protection_traveller_idx
  ON public.tsc_journey_protection(traveller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tsc_journey_protection_status_idx
  ON public.tsc_journey_protection(coverage_status, eligibility_status);

-- =========================================================
-- 9. SAFETY AUDIT HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tsc_safety_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  traveller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,

  entity_type text NOT NULL,
  entity_id uuid,

  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,

  actor_type text NOT NULL DEFAULT 'user'
    CHECK (actor_type IN ('user', 'admin', 'system')),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tsc_safety_audit_traveller_idx
  ON public.tsc_safety_audit_logs(traveller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tsc_safety_audit_journey_idx
  ON public.tsc_safety_audit_logs(journey_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tsc_safety_audit_entity_idx
  ON public.tsc_safety_audit_logs(entity_type, entity_id, created_at DESC);

-- =========================================================
-- 10. UPDATED_AT TRIGGERS
-- =========================================================

DROP TRIGGER IF EXISTS tsc_safety_profiles_updated_at
  ON public.tsc_safety_profiles;

CREATE TRIGGER tsc_safety_profiles_updated_at
BEFORE UPDATE ON public.tsc_safety_profiles
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_safety_contacts_updated_at
  ON public.tsc_safety_contacts;

CREATE TRIGGER tsc_safety_contacts_updated_at
BEFORE UPDATE ON public.tsc_safety_contacts
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_safety_risk_zones_updated_at
  ON public.tsc_safety_risk_zones;

CREATE TRIGGER tsc_safety_risk_zones_updated_at
BEFORE UPDATE ON public.tsc_safety_risk_zones
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_journey_risk_assessments_updated_at
  ON public.tsc_journey_risk_assessments;

CREATE TRIGGER tsc_journey_risk_assessments_updated_at
BEFORE UPDATE ON public.tsc_journey_risk_assessments
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_safety_checkins_updated_at
  ON public.tsc_safety_checkins;

CREATE TRIGGER tsc_safety_checkins_updated_at
BEFORE UPDATE ON public.tsc_safety_checkins
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_safety_alerts_updated_at
  ON public.tsc_safety_alerts;

CREATE TRIGGER tsc_safety_alerts_updated_at
BEFORE UPDATE ON public.tsc_safety_alerts
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_protection_settings_updated_at
  ON public.tsc_protection_settings;

CREATE TRIGGER tsc_protection_settings_updated_at
BEFORE UPDATE ON public.tsc_protection_settings
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

DROP TRIGGER IF EXISTS tsc_journey_protection_updated_at
  ON public.tsc_journey_protection;

CREATE TRIGGER tsc_journey_protection_updated_at
BEFORE UPDATE ON public.tsc_journey_protection
FOR EACH ROW EXECUTE FUNCTION public.tsc_safety_set_updated_at();

-- =========================================================
-- 11. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.tsc_safety_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_safety_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_safety_risk_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_journey_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_journey_risk_zone_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_safety_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_protection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_journey_protection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tsc_safety_audit_logs ENABLE ROW LEVEL SECURITY;

-- Safety profiles: travellers manage their own profiles.
CREATE POLICY "Travellers read own safety profile"
ON public.tsc_safety_profiles
FOR SELECT TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Travellers create own safety profile"
ON public.tsc_safety_profiles
FOR INSERT TO authenticated
WITH CHECK (traveller_id = (SELECT auth.uid()));

CREATE POLICY "Travellers update own safety profile"
ON public.tsc_safety_profiles
FOR UPDATE TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.manage')
)
WITH CHECK (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.manage')
);

-- Emergency contacts: private to the traveller and authorised administrators.
CREATE POLICY "Travellers read own safety contacts"
ON public.tsc_safety_contacts
FOR SELECT TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Travellers add own safety contacts"
ON public.tsc_safety_contacts
FOR INSERT TO authenticated
WITH CHECK (traveller_id = (SELECT auth.uid()));

CREATE POLICY "Travellers update own safety contacts"
ON public.tsc_safety_contacts
FOR UPDATE TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.manage')
)
WITH CHECK (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.manage')
);

CREATE POLICY "Travellers delete own safety contacts"
ON public.tsc_safety_contacts
FOR DELETE TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.manage')
);

-- Risk zones: authenticated users can read active zones.
CREATE POLICY "Authenticated users read active risk zones"
ON public.tsc_safety_risk_zones
FOR SELECT TO authenticated
USING (
  is_active = true
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Protection administrators manage risk zones"
ON public.tsc_safety_risk_zones
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- Risk assessments: travellers see their own journey assessments.
CREATE POLICY "Travellers read own journey risk assessments"
ON public.tsc_journey_risk_assessments
FOR SELECT TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Protection administrators manage risk assessments"
ON public.tsc_journey_risk_assessments
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

CREATE POLICY "Travellers read own risk zone matches"
ON public.tsc_journey_risk_zone_matches
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tsc_journey_risk_assessments assessment
    WHERE assessment.id = assessment_id
      AND (
        assessment.traveller_id = (SELECT auth.uid())
        OR public.tsc_has_permission('protection.view')
      )
  )
);

CREATE POLICY "Protection administrators manage risk zone matches"
ON public.tsc_journey_risk_zone_matches
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- Check-ins: travellers can read their own check-ins.
CREATE POLICY "Travellers read own safety checkins"
ON public.tsc_safety_checkins
FOR SELECT TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Protection administrators manage safety checkins"
ON public.tsc_safety_checkins
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- Alerts: travellers read their own alerts.
CREATE POLICY "Travellers read own safety alerts"
ON public.tsc_safety_alerts
FOR SELECT TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Protection administrators manage safety alerts"
ON public.tsc_safety_alerts
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- Coverage settings: enabled configurations are readable by travellers.
CREATE POLICY "Authenticated users read enabled protection settings"
ON public.tsc_protection_settings
FOR SELECT TO authenticated
USING (
  is_enabled = true
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Protection administrators manage protection settings"
ON public.tsc_protection_settings
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- Journey protection: travellers see their own coverage records.
CREATE POLICY "Travellers read own journey protection"
ON public.tsc_journey_protection
FOR SELECT TO authenticated
USING (
  traveller_id = (SELECT auth.uid())
  OR public.tsc_has_permission('protection.view')
);

CREATE POLICY "Protection administrators manage journey protection"
ON public.tsc_journey_protection
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- Audit history: visible only to authorised administrators.
CREATE POLICY "Protection administrators read safety audit logs"
ON public.tsc_safety_audit_logs
FOR SELECT TO authenticated
USING (public.tsc_has_permission('protection.view'));

CREATE POLICY "Protection administrators manage safety audit logs"
ON public.tsc_safety_audit_logs
FOR ALL TO authenticated
USING (public.tsc_has_permission('protection.manage'))
WITH CHECK (public.tsc_has_permission('protection.manage'));

-- =========================================================
-- 12. REALTIME
-- =========================================================

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tsc_safety_checkins',
    'tsc_safety_alerts',
    'tsc_journey_risk_assessments',
    'tsc_journey_protection'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

-- =========================================================
-- END: TSC SAFETY PROTECTION FOUNDATION
-- =========================================================

-- =========================================================
-- 13. IMMUTABLE SAFETY AUDIT HISTORY
-- =========================================================

-- Audit records are append-only.
-- Application writes must use trusted server-side operations.
DROP POLICY IF EXISTS "Protection administrators manage safety audit logs"
  ON public.tsc_safety_audit_logs;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.tsc_safety_audit_logs
  FROM anon, authenticated;

GRANT SELECT ON public.tsc_safety_audit_logs TO authenticated;

-- =========================================================
-- END: TSC SAFETY PROTECTION FOUNDATION
-- =========================================================
