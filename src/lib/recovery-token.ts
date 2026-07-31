import { createHmac, timingSafeEqual } from "node:crypto";

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

function signature(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createRecoveryToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyRecoveryToken(token: string, userId: string) {
  try {
    const [payload, providedSignature] = token.split(".");
    if (!payload || !providedSignature) return false;
    const provided = Buffer.from(providedSignature);
    const expected = Buffer.from(signature(payload));
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      return false;
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      userId?: string;
      expiresAt?: number;
    };
    return parsed.userId === userId && Number(parsed.expiresAt) > Date.now();
  } catch {
    return false;
  }
}
