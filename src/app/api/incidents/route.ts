import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IncidentRecord } from "@/lib/supabase/types";

// In-memory store for local development if database is unconfigured
let mockIncidentsStore: IncidentRecord[] = [];

export async function GET(): Promise<Response> {
  try {
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("incidents")
        .select("*, dependents(*)")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return NextResponse.json({ incidents: data, source: "supabase" });
      }
    }

    return NextResponse.json({
      incidents: mockIncidentsStore,
      source: "mock",
    });
  } catch (error) {
    console.error("GET /api/incidents error:", error);
    return NextResponse.json(
      { incidents: [], source: "mock", error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      dependent_id,
      nullifier,
      match_confidence,
      location_note,
      encrypted_photo_url,
    } = body;

    const case_token = `case-${crypto.randomUUID().slice(0, 8)}`;
    const newIncident: Omit<IncidentRecord, "id" | "created_at" | "resolved_at"> = {
      dependent_id: dependent_id || null,
      case_token,
      nullifier: nullifier || "0x0000000000000000",
      match_confidence: match_confidence || 0.95,
      status: "active",
      location_note: location_note || "Reported by verified bystander",
      encrypted_photo_url: encrypted_photo_url || null,
    };

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("incidents")
        .insert(newIncident)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert incident error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        incident: data,
        source: "supabase",
      });
    }

    const mockCreated: IncidentRecord = {
      id: `inc-${Date.now().toString(36)}`,
      ...newIncident,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };

    return NextResponse.json({
      success: true,
      incident: mockCreated,
      source: "mock",
    });
  } catch (error) {
    console.error("POST /api/incidents error:", error);
    return NextResponse.json(
      { error: "Internal server error creating incident" },
      { status: 500 }
    );
  }
}
