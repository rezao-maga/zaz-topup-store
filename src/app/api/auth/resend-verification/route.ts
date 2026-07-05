import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { authLimiter, checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { parseBody } from "@/lib/validation";
import { issueVerification } from "@/lib/verification";
import { z } from "zod";

const resendSchema = z.object({ email: z.email("Email tidak valid") });

export async function POST(req: NextRequest) {
  try {
    if (!(await checkRateLimit(authLimiter, getClientIp(req)))) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak percobaan. Coba lagi sebentar." },
        { status: 429 }
      );
    }

    const parsed = parseBody(resendSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    // Respons selalu sama, ada akunnya atau tidak: endpoint ini publik,
    // jangan jadi alat cek "email ini terdaftar atau nggak".
    if (user && !user.emailVerified) {
      await issueVerification(user.id, user.email);
    }

    return NextResponse.json({
      success: true,
      message: "Jika email terdaftar, link verifikasi sudah dikirim ulang.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
