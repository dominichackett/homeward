import { Resend } from "resend";

export interface EmergencyMatchEmailPayload {
  toEmail: string;
  recipientName: string;
  dependentName: string;
  caseToken: string;
  matchConfidence: number; // e.g. 0.95 to 1.0
  sightingLocation?: string | null;
  finderPhone?: string | null;
  finderName?: string | null;
  encryptedPhotoUrl?: string | null;
  timestamp?: string | number;
}

/**
 * Builds the responsive HTML email sent to the next-of-kin / primary guardian
 * when an enrolled individual is matched inside the CRE TEE hardware enclave.
 */
function buildEmergencyEmailHtml(payload: EmergencyMatchEmailPayload, alertUrl: string): string {
  const confidencePct = Math.round(payload.matchConfidence * 100);
  const dateStr = payload.timestamp
    ? new Date(payload.timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Just now";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Homeward Emergency Sighting Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #020617; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Emergency Banner -->
          <tr>
            <td style="background-color: #881337; padding: 14px 24px; text-align: left; border-bottom: 1px solid #be123c;">
              <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 9999px;">
                🚨 Urgent Safety Sighting
              </span>
              <span style="color: #fda4af; font-size: 12px; margin-left: 10px; font-weight: 600;">
                Case #${payload.caseToken.replace("case-", "").toUpperCase()}
              </span>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Possible Match for ${payload.dependentName}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                Hello ${payload.recipientName}, a verified bystander has captured a photo of an individual matching your registered dependent. 
                Biometrics were validated strictly inside a confidential hardware enclave with <strong>${confidencePct}% confidence</strong>.
              </p>

              <!-- Bystander Contact Box (If provided) -->
              ${
                payload.finderPhone
                  ? `
              <div style="background-color: #064e3b; border: 1px solid #059669; border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6ee7b7; margin-bottom: 4px;">
                  Bystander / Finder on Scene
                </div>
                <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                  ${payload.finderName || "Verified Good Samaritan"}
                </div>
                <div style="font-size: 14px; color: #a7f3d0; margin-bottom: 12px;">
                  Phone: <strong style="color: #ffffff;">${payload.finderPhone}</strong>
                </div>
                <a href="tel:${payload.finderPhone}" style="display: inline-block; background-color: #10b981; color: #022c22; font-size: 12px; font-weight: 700; text-decoration: none; padding: 8px 16px; border-radius: 8px;">
                  Call Bystander (${payload.finderPhone})
                </a>
              </div>
              `
                  : ""
              }

              <!-- Sighting Location & Time -->
              <div style="background-color: #020617; border: 1px solid #1e293b; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px;">
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #38bdf8; display: block; margin-bottom: 2px;">
                    Sighting Location / Notes:
                  </span>
                  <span style="font-size: 14px; color: #e2e8f0; line-height: 1.4;">
                    ${payload.sightingLocation || "Reported via Homeward Mobile Camera"}
                  </span>
                </div>
                <div>
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">
                    Reported Time:
                  </span>
                  <span style="font-size: 13px; color: #94a3b8;">
                    ${dateStr}
                  </span>
                </div>
              </div>

              <!-- Primary Action Button -->
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${alertUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 15px 32px; border-radius: 14px; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.4);">
                  Open Emergency Alert Screen &rarr;
                </a>
              </div>

              <!-- Privacy Notice -->
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 18px;">
                <strong>Zero-Knowledge Privacy Guarantee:</strong> The bystander who submitted this photo was never informed of your loved one&apos;s identity. All comparisons occurred within a tamper-proof hardware enclave. Sighting photos are automatically purged under Homeward&apos;s 48-hour privacy retention policy.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #020617; padding: 16px 28px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e293b;">
              Homeward Confidential Emergency Network &bull; Automated Next-of-Kin Alert
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an emergency match email to the enrolled next-of-kin via Resend.
 * Gracefully falls back to simulated console logging if RESEND_API_KEY is not configured.
 */
export async function sendEmergencyMatchEmail(
  payload: EmergencyMatchEmailPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const alertUrl = `${baseUrl}/alert/${payload.caseToken}`;
  const subject = `🚨 URGENT: Potential Sighting of ${payload.dependentName}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Homeward Alert <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;

  if (!payload.toEmail || !payload.toEmail.includes("@")) {
    console.warn(`[NOTIFICATIONS] Cannot send email: invalid or missing email for ${payload.recipientName}`);
    return { success: false, error: "Invalid recipient email" };
  }

  // If no Resend API key is configured, log simulated dispatch for local development
  if (!apiKey || apiKey === "re_your_api_key_here") {
    console.log(`
================================================================================
[RESEND NOTIFICATION (DEV SIMULATION)]
To: ${payload.recipientName} <${payload.toEmail}>
From: ${fromEmail}
Subject: ${subject}
Case Token: ${payload.caseToken}
Alert URL: ${alertUrl}
Finder Contact: ${payload.finderName || "Verified Bystander"} (${payload.finderPhone || "No phone"})
Sighting Notes: ${payload.sightingLocation || "None provided"}
================================================================================
    `);
    return { success: true, id: `simulated_${Date.now()}` };
  }

  try {
    const resend = new Resend(apiKey);
    const html = buildEmergencyEmailHtml(payload, alertUrl);

    console.log(`[NOTIFICATIONS] Dispatching emergency email via Resend to ${payload.toEmail}...`);

    const result = await resend.emails.send({
      from: fromEmail,
      to: [payload.toEmail],
      subject,
      html,
    });

    if (result.error) {
      console.error("[NOTIFICATIONS] Resend API error:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[NOTIFICATIONS] Emergency email successfully delivered via Resend. ID: ${result.data?.id}`);
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("[NOTIFICATIONS] Unexpected error sending email via Resend:", err);
    return { success: false, error: err.message || "Failed to dispatch email" };
  }
}
