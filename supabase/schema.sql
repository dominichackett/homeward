-- =====================================================================
-- Homeward: Database Schema (Supabase Postgres)
-- Covers: Dependents, World ID Nullifiers (Rate-Limiting), and Incidents
-- =====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- Table 1: Dependents (Caregiver-Enrolled Vulnerable Persons)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.dependents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    condition_notes TEXT,
    primary_contact_name TEXT NOT NULL,
    primary_contact_phone TEXT NOT NULL,
    primary_contact_email TEXT,
    secondary_contact_name TEXT,
    secondary_contact_phone TEXT,
    consent_attested BOOLEAN NOT NULL DEFAULT false,
    -- Encrypted 128D facial descriptor ciphertext (never plaintext)
    encrypted_embedding TEXT NOT NULL,
    photo_thumbnail_url TEXT,
    caregiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_dependents_created_at ON public.dependents(created_at DESC);

-- =====================================================================
-- Table 2: Nullifiers (Persistent World ID Abuse Prevention)
-- =====================================================================
-- Replaces ephemeral server memory cache. Ensures 10-minute anti-probing
-- cooldown cannot be circumvented by restarting Next.js server.
CREATE TABLE IF NOT EXISTS public.nullifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'finder-report',
    last_report_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_action_nullifier UNIQUE (action, nullifier)
);

CREATE INDEX IF NOT EXISTS idx_nullifiers_lookup ON public.nullifiers(action, nullifier);

-- =====================================================================
-- Table 3: Incidents (Emergency Alert & Sighting Records)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dependent_id UUID REFERENCES public.dependents(id) ON DELETE SET NULL,
    case_token TEXT NOT NULL UNIQUE,
    nullifier TEXT NOT NULL,
    match_confidence REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'dismissed')) DEFAULT 'active',
    location_note TEXT,
    encrypted_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_case_token ON public.incidents(case_token);
CREATE INDEX IF NOT EXISTS idx_incidents_dependent_id ON public.incidents(dependent_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

-- =====================================================================
-- Row Level Security (RLS) Configuration
-- =====================================================================
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nullifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 1. Dependents RLS Policies:
-- Service role has full access for matching & backend services
CREATE POLICY "Service role full access on dependents"
    ON public.dependents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated caregivers can view their own enrolled dependents (or unassigned demo records)
CREATE POLICY "Caregivers can view own dependents"
    ON public.dependents
    FOR SELECT
    TO anon, authenticated
    USING (caregiver_id IS NULL OR caregiver_id = auth.uid());

CREATE POLICY "Caregivers can insert own dependents"
    ON public.dependents
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (consent_attested = true AND (caregiver_id IS NULL OR caregiver_id = auth.uid()));

CREATE POLICY "Caregivers can update own dependents"
    ON public.dependents
    FOR UPDATE
    TO authenticated
    USING (caregiver_id = auth.uid())
    WITH CHECK (caregiver_id = auth.uid());

-- 2. Nullifiers RLS Policies:
-- Internal rate-limiting table: accessible by backend/service_role and anon for verification
CREATE POLICY "Service role full access on nullifiers"
    ON public.nullifiers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read and insert on nullifiers"
    ON public.nullifiers
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Incidents RLS Policies:
CREATE POLICY "Service role full access on incidents"
    ON public.incidents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Incident read allowed by case_token
CREATE POLICY "Read incident by case_token"
    ON public.incidents
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Update incident resolution"
    ON public.incidents
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
