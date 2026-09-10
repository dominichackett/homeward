import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runCreConfidentialMatch } from "@/cre/workflow";
import { sendEmergencyMatchEmail } from "@/lib/notifications";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      nullifier,
      encrypted_embedding,
      location_note,
      finder_phone,
      finder_name,
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
    // Anti-probing rate limits identical World ID nullifiers to prevent mass-probing.
    // Development mode, sandbox environments, dev-bypass nullifiers (0xdev_*), and explicit DISABLE_COOLDOWN are exempt.
    const isDevNullifier = typeof nullifier === "string" && nullifier.startsWith("0xdev_");
    const isDevMode = process.env.NODE_ENV === "development";
    const isSandbox =
      process.env.NEXT_PUBLIC_WLD_ENVIRONMENT === "sandbox" ||
      process.env.WLD_ENVIRONMENT === "sandbox";
    const isCooldownDisabled = process.env.DISABLE_COOLDOWN === "true";

    const shouldEnforceCooldown =
      !isDevNullifier && !isDevMode && !isSandbox && !isCooldownDisabled;

    if (supabase && shouldEnforceCooldown) {
      const { data: nullifierRecord } = await supabase
        .from("nullifiers")
        .select("last_report_at")
        .eq("action", "finder-report")
        .eq("nullifier", nullifier)
        .maybeSingle();

      if (nullifierRecord?.last_report_at) {
        const elapsed = Date.now() - new Date(nullifierRecord.last_report_at).getTime();
        const cooldownMs = 10 * 60 * 1000; // 10 minutes
        // Require elapsed > 15s to prevent self-colliding with a timestamp created in the same flow
        if (elapsed > 15 * 1000 && elapsed < cooldownMs) {
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
      primary_contact_name?: string;
      primary_contact_phone?: string;
      primary_contact_email?: string;
    }> = [];

    if (supabase) {
      const { data: dependentsData, error: depError } = await supabase
        .from("dependents")
        .select("id, full_name, encrypted_embedding, primary_contact_name, primary_contact_phone, primary_contact_email");

      if (!depError && dependentsData && Array.isArray(dependentsData)) {
        candidates = dependentsData
          .filter((d: any) => d.encrypted_embedding)
          .map((d: any) => ({
            id: d.id,
            encryptedEmbedding: d.encrypted_embedding,
            full_name: d.full_name,
            primary_contact_name: d.primary_contact_name,
            primary_contact_phone: d.primary_contact_phone,
            primary_contact_email: d.primary_contact_email,
          }));
      }
    }

    // 4. Execute Chainlink CRE TEE Confidential Workflow
    let enclaveResult = null;

    // Check if the CRE CLI simulator (--listen on port 2000) is running
    const rawUrl = process.env.CRE_SIMULATOR_URL || "http://localhost:2000";
    const creSimulatorUrl = rawUrl.endsWith("/trigger") ? rawUrl : `${rawUrl.replace(/\/$/, "")}/trigger`;
    try {
      const creRes = await fetch(creSimulatorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            encrypted_embedding,
            candidates: candidates.map((c) => ({
              id: c.id,
              encryptedEmbedding: c.encryptedEmbedding,
            })),
            timestamp: Date.now(),
          },
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (creRes.ok) {
        const rawText = await creRes.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawText);
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
        } catch {}

        if (parsed && typeof parsed.matched === "boolean") {
          const isMatch = Boolean(parsed.matched);
          const matchedId = parsed.dependent_id || null;
          const dist = parsed.euclidean_distance != null ? Number(parsed.euclidean_distance) : null;
          const timestamp = parsed.enclave_timestamp || Date.now();
          const confidence = isMatch && dist !== null ? Math.max(80, Math.round((1 - dist / 0.40) * 20 + 80)) : 0;
          const hashDigest = crypto
            .createHash("sha256")
            .update(`CRE_SIMULATOR:${encrypted_embedding.slice(0, 32)}:${matchedId}:${dist}:${timestamp}`)
            .digest("hex");

          console.log(
            `[CRE SIMULATOR] Live response from ${creSimulatorUrl} -> Matched: ${isMatch}, ID: ${matchedId}, Distance: ${dist}`
          );

          enclaveResult = {
            matched: isMatch,
            matchedDependentId: matchedId,
            euclideanDistance: dist,
            confidenceScore: confidence,
            executionHash: `0x${hashDigest}`,
            enclaveTimestamp: timestamp,
            candidateCount: candidates.length,
          };
        }
      }
    } catch {
      // CRE simulator not reachable or timed out; will fall back to runCreConfidentialMatch
    }

    if (!enclaveResult) {
      enclaveResult = await runCreConfidentialMatch(
        encrypted_embedding,
        candidates.map((c) => ({
          id: c.id,
          encryptedEmbedding: c.encryptedEmbedding,
        })),
        0.40 // Euclidean distance threshold
      );
    }

    let caseToken: string | null = null;
    let matchedPerson: any = null;

    // 5. Handle Match Outcome
    if (enclaveResult.matched && enclaveResult.matchedDependentId) {
      caseToken = `case-${crypto.randomUUID().slice(0, 8)}`;

      // Structure location_note to include verified finder contact details
      const contactParts: string[] = [];
      if (finder_name && typeof finder_name === "string" && finder_name.trim()) {
        contactParts.push(`Finder: ${finder_name.trim()}`);
      }
      if (finder_phone && typeof finder_phone === "string" && finder_phone.trim()) {
        contactParts.push(`Phone: ${finder_phone.trim()}`);
      }
      const contactPrefix = contactParts.length > 0 ? `[Contact: ${contactParts.join(" | ")}] ` : "";
      const fullLocationNote = `${contactPrefix}${location_note?.trim() || "Reported by verified bystander"}`;

      const newIncident = {
        dependent_id: enclaveResult.matchedDependentId,
        case_token: caseToken,
        nullifier,
        match_confidence: (enclaveResult.confidenceScore || 95) / 100,
        status: "active" as const,
        location_note: fullLocationNote,
        encrypted_photo_url: encrypted_photo_url || null,
      };

      if (supabase) {
        const { error: incError } = await supabase
          .from("incidents")
          .insert(newIncident);

        if (incError) {
          console.error("Supabase insert incident error:", incError);
        }
      }

      matchedPerson = candidates.find(
        (c) => c.id === enclaveResult.matchedDependentId
      );

      console.log(
        `[CRE TEE MATCH] Confirmed match for: ${matchedPerson?.full_name || enclaveResult.matchedDependentId}. Case Token: ${caseToken}. Finder Phone: ${finder_phone || "Not provided"}`
      );

      // 5b. Dispatch Emergency Email Notification to Next-of-Kin via Resend
      if (matchedPerson?.primary_contact_email) {
        sendEmergencyMatchEmail({
          toEmail: matchedPerson.primary_contact_email,
          recipientName: matchedPerson.primary_contact_name || "Caregiver / Next-of-Kin",
          dependentName: matchedPerson.full_name || "Enrolled Individual",
          caseToken: caseToken,
          matchConfidence: (enclaveResult.confidenceScore || 95) / 100,
          sightingLocation: location_note || null,
          finderPhone: finder_phone || null,
          finderName: finder_name || null,
          encryptedPhotoUrl: encrypted_photo_url || null,
          timestamp: Date.now(),
        }).catch((err) => {
          console.error("[NOTIFICATIONS] Failed to dispatch Resend email alert:", err);
        });
      } else {
        console.warn(
          `[NOTIFICATIONS] No primary_contact_email on file for matched individual: ${matchedPerson?.full_name || enclaveResult.matchedDependentId}`
        );
      }
    }

    const isDev =
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_ENABLE_DEV_DEBUG !== "false" &&
      process.env.ENABLE_DEV_DEBUG !== "false";

    // 6. Record persistent nullifier timestamp to prevent future mass probing (only in live enforcement mode)
    if (supabase && shouldEnforceCooldown) {
      Promise.resolve(
        supabase.from("nullifiers").upsert(
          {
            action: "finder-report",
            nullifier,
            last_report_at: new Date().toISOString(),
          },
          { onConflict: "action,nullifier" }
        )
      ).catch((err: unknown) => {
        console.warn("Failed to persist nullifier report timestamp:", err);
      });
    }

    // 7. Confirmation to Finder (Privacy Invariant)
    // The finder learns whether a match occurred (matched: true/false), but NEVER receives personal identity, contact, or biometric details.
    return NextResponse.json({
      success: true,
      processed: true,
      matched: enclaveResult.matched,
      execution_receipt: {
        enclave_hash: enclaveResult.executionHash,
        timestamp: enclaveResult.enclaveTimestamp,
      },
      message: enclaveResult.matched
        ? "Match confirmed in secure registry. Emergency contacts have been notified."
        : "No match found in secure registry.",
      ...(isDev && {
        _dev_debug: {
          matched: enclaveResult.matched,
          matchedName: matchedPerson?.full_name || null,
          dependentId: enclaveResult.matchedDependentId,
          confidence: enclaveResult.confidenceScore,
          distance: enclaveResult.euclideanDistance,
          caseToken,
          alertUrl: caseToken ? `/alert/${caseToken}` : null,
          finderPhone: finder_phone || null,
          finderName: finder_name || null,
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
