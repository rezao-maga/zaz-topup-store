import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Buat token verifikasi baru untuk user, simpan hash-nya di DB, lalu kirim
 * emailnya. Token lama otomatis tidak berlaku karena kolomnya ditimpa.
 *
 * Dipakai oleh: register route & resend-verification route.
 */
export async function issueVerification(
  userId: string,
  email: string,
): Promise<{ ok: boolean }> {
  // base64url: aman dipakai di URL tanpa encoding tambahan.
  const token = randomBytes(32).toString("base64url");

  await db
    .update(users)
    .set({
      verifyTokenHash: hashToken(token),
      verifyTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
    })
    .where(eq(users.id, userId));

  const result = await sendVerificationEmail(email, token);
  return { ok: result.ok };
}
