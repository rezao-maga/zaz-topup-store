import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { authLimiter, checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { registerSchema, parseBody } from "@/lib/validation";
import { issueVerification } from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    if (!(await checkRateLimit(authLimiter, getClientIp(req)))) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak percobaan. Coba lagi sebentar." },
        { status: 429 }
      );
    }

    const parsed = parseBody(registerSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { success: false, message: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword })
      .returning({ id: users.id });

    // Gagal kirim email ≠ gagal register: akun tetap dibuat, user bisa
    // minta kirim ulang. Frontend pakai flag ini untuk memberi tahu.
    const { ok: emailSent } = await issueVerification(created.id, email);

    return NextResponse.json(
      {
        success: true,
        message: "Register berhasil. Cek email kamu untuk verifikasi.",
        emailSent,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}