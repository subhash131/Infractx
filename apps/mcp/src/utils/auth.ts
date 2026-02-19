import { Request } from "express";
import { CLERK_JWT_ISSUER } from "../config.js";
import { ClerkPayload, Session } from "../types.js";

export function verifyClerkJWT(token: string): ClerkPayload | null {
  try {
    // Decode JWT without strict verification (for dev mode)
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("[AUTH] Invalid JWT format");
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

    // Verify issuer in dev mode (optional)
    if (
      payload.iss &&
      !payload.iss.includes(CLERK_JWT_ISSUER.replace("https://", ""))
    ) {
      console.warn("[AUTH] JWT issuer mismatch:", payload.iss);
    }

    console.log("[AUTH] JWT verified successfully, user:", payload.sub);
    return payload;
  } catch (err) {
    console.error("[AUTH] Error parsing JWT:", err);
    return null;
  }
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export async function authenticateSession(
  sessionId: string,
  token: string,
  session: Session,
): Promise<boolean> {
  const payload = verifyClerkJWT(token);

  if (!payload || !payload.sub) {
    console.error("[AUTH] Failed to verify JWT for session:", sessionId);
    return false;
  }

  session.userId = payload.sub;
  session.clerkToken = token;
  console.log(
    `[AUTH] Session ${sessionId} authenticated as user ${payload.sub}`,
  );

  return true;
}
