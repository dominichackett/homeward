import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runCreConfidentialMatch } from "@/cre/workflow";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      nullifier,
      encrypted_embedding,
      location_note,
      encrypted_photo_url,
    } = body;

    // 1. Validate required inputs
    if (!nullifier) {
      return NextResponse.json(
        { error: "World ID verified nullifier is required" },
        { status: 400 }
      );
    }

    if (!encrypted_embedding) {
      return NextResponse.json(
        { error: "Encrypted biometric embedding is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 2. Persistent Cooldown Check (World ID Nullifier Anti-Probing)
    if (supabase) {
      const { data: nullifierRecord } = await supabase
        .from("nullifiers")
        .select("last_report_at")
        .eq("action", "finder-report")
        .eq("nullifier", nullifier)
        .maybeSingle();

      if (nullifierRecord?.last_report_at) {
        const elapsed = Date.now() - new Date(nullifierRecord.last_report_at).getTime();
        const cooldownMs = 10 * 60 * 1000; // 10 minutes
        if (elapsed < cooldownMs) {
          const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
          return NextResponse.json(
            {
              error: `Anti-probing cooldown active. Please wait ${waitSeconds}s before submitting again.`,
              code: "THROTTLED",
            },
            { status: 429 }
          );
        }
      }
    }

    // 3. Fetch Enrolled Dependent Biometric Ciphertexts
    let candidates: Array<{
      id: string;
      encryptedEmbedding: string;
      full_name?: string;
      primary_contact_phone?: string;
    }> = [];

    if (supabase) {
      const { data: dependentsData, error: depError } = await supabase
        .from("dependents")
        .select("id, full_name, encrypted_embedding, primary_contact_phone");

      if (!depError && dependentsData && Array.isArray(dependentsData)) {
        candidates = dependentsData
          .filter((d: any) => d.encrypted_embedding)
          .map((d: any) => ({
            id: d.id,
            encryptedEmbedding: d.encrypted_embedding,
            full_name: d.full_name,
            primary_contact_phone: d.primary_contact_phone,
          }));
      }
    }

    // 4. Execute Chainlink CRE TEE Confidential Workflow (handlerInTee)
    const enclaveResult = await runCreConfidentialMatch(
      encrypted_embedding,
      candidates.map((c) => ({
        id: c.id,
        encryptedEmbedding: c.encryptedEmbedding,
      })),
      0.40 // Euclidean distance threshold
    );

    let caseToken: string | null = null;
    let matchedPerson: any = null;

    // 5. Handle Match Outcome
    if (enclaveResult.matched && enclaveResult.matchedDependentId) {
      caseToken = `case-${crypto.randomUUID().slice(0, 8)}`;
      const newIncident = {
        dependent_id: enclaveResult.matchedDependentId,
        case_token: caseToken,
        nullifier,
        match_confidence: (enclaveResult.confidenceScore || 95) / 100,
        status: "active" as const,
        location_note: location_note || "Reported by verified bystander",
        encrypted_photo_url: encrypted_photo_url || null,
      };

      if (supabase) {
        const { error: incError } = await supabase
          .from("incidents")
          .insert(newIncident);

        if (incError) {
          console.error("Supabase insert incident error:", incError);
        }

        // Upsert nullifier timestamp to record valid submission
        await supabase.from("nullifiers").upsert({
          nullifier,
          action: "finder-report",
          last_report_at: new Date().toISOString(),
        });
      }

      matchedPerson = candidates.find(
        (c) => c.id === enclaveResult.matchedDependentId
      );

      console.log(
        `[CRE TEE MATCH] Confirmed match for: ${matchedPerson?.full_name || enclaveResult.matchedDependentId}. Case Token: ${caseToken}. Emergency Phone: ${matchedPerson?.primary_contact_phone || "Unknown"}`
      );
    }

    const isDev = process.env.NODE_ENV === "development";

    // 6. Generic Confirmation to Finder (Privacy Invariant)
    // The finder NEVER learns whether a match was confirmed or who the individual is.
    return NextResponse.json({
      success: true,
      processed: true,
      execution_receipt: {
        enclave_hash: enclaveResult.executionHash,
        timestamp: enclaveResult.enclaveTimestamp,
      },
      message:
        "Biometric comparison completed privately inside secure hardware enclave. If enrolled, next-of-kin have been notified.",
      ...(isDev && {
        _dev_debug: {
          matched: enclaveResult.matched,
          matchedName: matchedPerson?.full_name || null,
          dependentId: enclaveResult.matchedDependentId,
          confidence: enclaveResult.confidenceScore,
          distance: enclaveResult.euclideanDistance,
          caseToken,
          alertUrl: caseToken ? `/alert/${caseToken}` : null,
        },
      }),
    });
  } catch (error) {
    console.error("POST /api/match error:", error);
    return NextResponse.json(
      { error: "Internal error processing biometric match" },
      { status: 500 }
    );
  }
}
