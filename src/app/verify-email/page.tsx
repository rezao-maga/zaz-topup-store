import Link from "next/link";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { hashToken } from "@/lib/verification";

// Server component: verifikasi jalan di server saat halaman dibuka, jadi
// tidak perlu API route + fetch dari client — link di email langsung
// mendarat di sini. ponytail: verifikasi via GET itu praktik umum, tapi
// email scanner (Gmail dll) kadang membuka link duluan; kalau itu jadi
// masalah, upgrade ke halaman dengan tombol "Verifikasi" yang POST.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  if (token) {
    const [updated] = await db
      .update(users)
      .set({ emailVerified: true, verifyTokenHash: null, verifyTokenExpires: null })
      .where(
        and(
          eq(users.verifyTokenHash, hashToken(token)),
          gt(users.verifyTokenExpires, new Date())
        )
      )
      .returning({ id: users.id });
    ok = Boolean(updated);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm border border-slate-200 bg-white p-8 text-center shadow-sm">
        {ok ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Email terverifikasi!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Akun kamu sudah aktif. Silakan masuk untuk mulai top up.
            </p>
            <Link
              href="/login"
              className="mt-6 block w-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Masuk Sekarang
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Link tidak valid</h1>
            <p className="mt-2 text-sm text-slate-500">
              Link verifikasi salah, kedaluwarsa, atau sudah pernah dipakai.
              Minta link baru lewat halaman login.
            </p>
            <Link
              href="/login"
              className="mt-6 block w-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Ke Halaman Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
