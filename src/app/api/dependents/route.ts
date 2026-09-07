import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DependentRecord } from "@/lib/supabase/types";

// Fallback seed data for local testing when Supabase DB is offline
const INITIAL_MOCK_DEPENDENTS: DependentRecord[] = [
  {
    id: "dep-001",
    full_name: "Eleanor Vance",
    condition_notes:
      "Alzheimer's (Moderate). May become disoriented in crowded spaces. Responds warmly to soft classical music.",
    primary_contact_name: "Sarah Vance",
    primary_contact_phone: "+1 (555) 234-5678",
    primary_contact_email: "sarah.vance@example.com",
    secondary_contact_name: "Robert Vance",
    secondary_contact_phone: "+1 (555) 234-5679",
    consent_attested: true,
    encrypted_embedding: "enc_v1_8f93a10c9e782b4df0123456789abcde",
    photo_thumbnail_url: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "dep-002",
    full_name: "Lucas Rivera",
    condition_notes:
      "Non-verbal Autism Spectrum. Non-verbal when stressed. Sensitive to sirens and flashing lights. Likes trains.",
    primary_contact_name: "Elena Rivera",
    primary_contact_phone: "+1 (555) 876-5432",
    primary_contact_email: "elena.rivera@example.com",
    secondary_contact_name: null,
    secondary_contact_phone: null,
    consent_attested: true,
    encrypted_embedding: "enc_v1_3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
    photo_thumbnail_url: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export async function GET(): Promise<Response> {
  try {
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("dependents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ dependents: data, source: "supabase" });
      }
    }

    // Fallback to mock data if database is empty or unconfigured
    return NextResponse.json({
      dependents: INITIAL_MOCK_DEPENDENTS,
      source: "mock",
    });
  } catch (error) {
    console.error("GET /api/dependents error:", error);
    return NextResponse.json(
      { dependents: INITIAL_MOCK_DEPENDENTS, source: "mock", error: "Failed to fetch from database" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      full_name,
      condition_notes,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email,
      secondary_contact_name,
      secondary_contact_phone,
      consent_attested,
      encrypted_embedding,
      photo_thumbnail_url,
    } = body;

    if (!full_name || !primary_contact_name || !primary_contact_phone) {
      return NextResponse.json(
        { error: "Missing required enrollment fields" },
        { status: 400 }
      );
    }

    if (!consent_attested) {
      return NextResponse.json(
        { error: "Legal guardian consent attestation is required" },
        { status: 400 }
      );
    }

    // Default simulated embedding ciphertext if not generated on client
    const finalEmbedding =
      encrypted_embedding ||
      `enc_v1_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    const newDependent: Omit<DependentRecord, "id" | "created_at" | "updated_at"> = {
      full_name,
      condition_notes: condition_notes || null,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email: primary_contact_email || null,
      secondary_contact_name: secondary_contact_name || null,
      secondary_contact_phone: secondary_contact_phone || null,
      consent_attested: true,
      encrypted_embedding: finalEmbedding,
      photo_thumbnail_url: photo_thumbnail_url || null,
    };

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("dependents")
        .insert(newDependent)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert dependent error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        dependent: data,
        source: "supabase",
      });
    }

    // Mock fallback response
    const mockCreated: DependentRecord = {
      id: `dep-${Date.now().toString(36)}`,
      ...newDependent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      dependent: mockCreated,
      source: "mock",
    });
  } catch (error) {
    console.error("POST /api/dependents error:", error);
    return NextResponse.json(
      { error: "Internal server error creating dependent" },
      { status: 500 }
    );
  }
}
