import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DependentRecord } from "@/lib/supabase/types";

// In-memory store for local testing if Supabase is offline
let mockDependentsStore: DependentRecord[] = [];

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const caregiverId = searchParams.get("caregiver_id");
    const supabase = getSupabaseServerClient();

    if (supabase) {
      let query = supabase
        .from("dependents")
        .select("*")
        .order("created_at", { ascending: false });

      // If caregiverId is provided, filter strictly by this caregiver
      if (caregiverId) {
        query = query.eq("caregiver_id", caregiverId);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return NextResponse.json({ dependents: data, source: "supabase" });
      }
      if (error) {
        console.warn("Supabase query warning:", error.message);
      }
    }

    // Fallback to in-memory store if database connection unavailable
    let list = [...mockDependentsStore];
    if (caregiverId) {
      list = list.filter((d) => d.caregiver_id === caregiverId);
    }

    return NextResponse.json({
      dependents: list,
      source: "mock",
    });
  } catch (error) {
    console.error("GET /api/dependents error:", error);
    return NextResponse.json(
      { dependents: mockDependentsStore, source: "mock", error: "Failed to fetch from database" },
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
      caregiver_id,
    } = body;

    if (!full_name || !primary_contact_name || !primary_contact_phone) {
      return NextResponse.json(
        { error: "Missing required enrollment fields: full name, primary contact name, or phone" },
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
      caregiver_id: caregiver_id || null,
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

    // Mock fallback response: persist in mock memory store so it displays immediately
    const mockCreated: DependentRecord = {
      id: `dep-${Date.now().toString(36)}`,
      ...newDependent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDependentsStore.unshift(mockCreated);

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

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing dependent id parameter" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.from("dependents").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, source: "supabase" });
    }

    // Mock fallback: delete from in-memory store
    mockDependentsStore = mockDependentsStore.filter((d) => d.id !== id);
    return NextResponse.json({ success: true, source: "mock" });
  } catch (error) {
    console.error("DELETE /api/dependents error:", error);
    return NextResponse.json(
      { error: "Internal server error deleting dependent" },
      { status: 500 }
    );
  }
}

