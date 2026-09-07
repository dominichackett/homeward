import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseToken: string }> }
): Promise<Response> {
  try {
    const { caseToken } = await params;
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("incidents")
        .select("*, dependents(*)")
        .eq("case_token", caseToken)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ incident: data, source: "supabase" });
      }
    }

    // Mock incident fallback for case-7f8a9b or any valid token format
    return NextResponse.json({
      incident: {
        id: "inc-001",
        dependent_id: "dep-001",
        case_token: caseToken,
        nullifier: "0x8f2d...1a9e",
        match_confidence: 0.984,
        status: "active",
        location_note: "Near Central Metro Station, Entrance 3 (GPS: 40.7580° N, 73.9855° W)",
        encrypted_photo_url: null,
        created_at: new Date(Date.now() - 42 * 60000).toISOString(),
        resolved_at: null,
        dependents: {
          id: "dep-001",
          full_name: "Eleanor Vance",
          condition_notes:
            "Alzheimer's (Moderate). May become disoriented in crowded spaces. Responds warmly to soft classical music. Hard of hearing in left ear.",
          primary_contact_name: "Sarah Vance",
          primary_contact_phone: "+1 (555) 234-5678",
          primary_contact_email: "sarah.vance@example.com",
        },
      },
      source: "mock",
    });
  } catch (error) {
    console.error("GET /api/incidents/[caseToken] error:", error);
    return NextResponse.json(
      { error: "Failed to resolve incident" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseToken: string }> }
): Promise<Response> {
  try {
    const { caseToken } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status || "resolved";
    const resolved_at = new Date().toISOString();

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("incidents")
        .update({ status, resolved_at })
        .eq("case_token", caseToken)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, incident: data, source: "supabase" });
      }
    }

    return NextResponse.json({
      success: true,
      incident: {
        case_token: caseToken,
        status,
        resolved_at,
      },
      source: "mock",
    });
  } catch (error) {
    console.error("PATCH /api/incidents/[caseToken] error:", error);
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    );
  }
}
