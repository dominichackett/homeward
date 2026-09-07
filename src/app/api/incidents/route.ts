import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IncidentRecord } from "@/lib/supabase/types";

const INITIAL_MOCK_INCIDENTS: IncidentRecord[] = [
  {
    id: "inc-001",
    dependent_id: "dep-001",
    case_token: "case-7f8a9b",
    nullifier: "0x8f2d...1a9e",
    match_confidence: 0.984,
    status: "active",
    location_note: "Near Central Metro Station, Entrance 3 (GPS: 40.7580° N, 73.9855° W)",
    encrypted_photo_url: null,
    created_at: new Date(Date.now() - 42 * 60000).toISOString(),
    resolved_at: null,
  },
];

export async function GET(): Promise<Response> {
  try {
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("incidents")
        .select("*, dependents(*)")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ incidents: data, source: "supabase" });
      }
    }

    return NextResponse.json({
      incidents: INITIAL_MOCK_INCIDENTS,
      source: "mock",
    });
  } catch (error) {
    console.error("GET /api/incidents error:", error);
    return NextResponse.json(
      { incidents: INITIAL_MOCK_INCIDENTS, source: "mock", error: "Failed to fetch incidents" },
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
