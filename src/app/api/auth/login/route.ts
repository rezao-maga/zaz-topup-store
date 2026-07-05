import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { authLimiter, checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { loginSchema, parseBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    if (!(await checkRateLimit(authLimiter, getClientIp(req)))) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak percobaan. Coba lagi sebentar." },
        { status: 429 }
      );
    }

    const parsed = parseBody(loginSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = result[0];
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" },
        { status: 401 }
      );
    }

    // Cek verifikasi SETELAH password valid: kalau dicek sebelum, orang bisa
    // memakai respons ini untuk menebak email mana yang terdaftar.
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Email belum diverifikasi. Cek inbox kamu.",
          needVerification: true,
        },
        { status: 403 }
      );
    }

    const token = generateToken(user);
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}