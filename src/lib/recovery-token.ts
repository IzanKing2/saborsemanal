import { createHmac, timingSafeEqual } from "node:crypto";

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

function signature(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createRecoveryToken(userId: string, email: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      email,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyRecoveryToken(
  token: string,
): { userId: string; email: string } | null {
  try {
    const [payload, providedSignature] = token.split(".");
    if (!payload || !providedSignature) return null;
    const provided = Buffer.from(providedSignature);
    const expected = Buffer.from(signature(payload));
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      userId?: string;
      email?: string;
      expiresAt?: number;
    };
    return typeof parsed.userId === "string" &&
      typeof parsed.email === "string" &&
      Number(parsed.expiresAt) > Date.now()
      ? { userId: parsed.userId, email: parsed.email }
      : null;
  } catch {
    return null;
  }
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}
