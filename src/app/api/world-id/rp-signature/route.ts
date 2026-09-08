import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || process.env.NEXT_PUBLIC_WLD_ACTION || "finder-report";
    const signingKeyHex = process.env.WLD_RP_SIGNING_KEY;
    const rpId = (process.env.WLD_RP_ID || "rp_b546d489b2d5273a") as `rp_${string}`;

    // Use configured signing key or default development signing key
    const effectiveSigningKey =
      signingKeyHex && signingKeyHex.startsWith("0x") && signingKeyHex.length === 66
        ? signingKeyHex
        : "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: effectiveSigningKey,
      action,
    });

    return NextResponse.json({
      rp_id: rpId,
      sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("RP signature generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate RP signature" },
      { status: 500 }
    );
  }
}
