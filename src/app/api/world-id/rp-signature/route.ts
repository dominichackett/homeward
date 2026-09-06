import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || process.env.NEXT_PUBLIC_WLD_ACTION || "finder-report";
    const signingKeyHex = process.env.WLD_RP_SIGNING_KEY;
    const rpId = (process.env.WLD_RP_ID || "rp_b546d489b2d5273a") as `rp_${string}`;

    if (signingKeyHex && signingKeyHex.startsWith("0x") && signingKeyHex.length === 66) {
      const { sig, nonce, createdAt, expiresAt } = signRequest({
        signingKeyHex,
        action,
      });

      return NextResponse.json({
        rp_id: rpId,
        sig,
        nonce,
        created_at: createdAt,
        expires_at: expiresAt,
      });
    }

    // Fallback development signature for local testing & staging simulator
    const now = Math.floor(Date.now() / 1000);
    return NextResponse.json({
      rp_id: rpId,
      sig: "0x0000000000000000000000000000000000000000000000000000000000000000",
      nonce: crypto.randomUUID(),
      created_at: now,
      expires_at: now + 3600,
      is_mock: true,
    });
  } catch (error) {
    console.error("RP signature generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate RP signature" },
      { status: 500 }
    );
  }
}
