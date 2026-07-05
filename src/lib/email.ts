import { Resend } from "resend";
import { z } from "zod";

// Instance dibuat sekali di level module, bukan di dalam fungsi.
// KENAPA: module di Node di-cache setelah import pertama, jadi ini efektif
// singleton gratis — tanpa class atau pattern tambahan. Resend TIDAK throw
// kalau API key undefined saat construct; dia baru error saat kirim, jadi
// build tetap jalan meskipun env belum diset (error muncul di runtime, di
// tempat yang tepat: saat benar-benar mencoba kirim).
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "ZazStore <no-reply@zazstore.my.id>";

// KENAPA validasi ulang padahal register route sudah validasi:
// file ini adalah trust boundary — dia tidak tahu (dan tidak boleh berasumsi)
// siapa pemanggilnya. Hari ini dipanggil dari register yang sudah tervalidasi;
// besok dipanggil dari cron "kirim ulang" yang lupa validasi. Validasi di sini
// membuat fungsi ini aman berdiri sendiri, bukan bergantung pada disiplin caller.
const emailSchema = z.email("Alamat email tidak valid");

type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Kirim email verifikasi berisi link `${APP_URL}/verify-email?token=...`.
 * Token dibuat & disimpan di layer lain — file ini cuma tukang kirim.
 *
 * KENAPA return object, bukan throw: gagal kirim email bukan kegagalan fatal.
 * Caller (register route) yang paling tahu konsekuensinya — misal tetap
 * menyukseskan register lalu menawarkan "kirim ulang". Throw memaksa semua
 * caller pasang try-catch, dan yang lupa akan menjatuhkan seluruh request
 * hanya karena SMTP-nya Resend lagi batuk.
 */
export async function sendVerificationEmail(to: string, token: string): Promise<SendResult> {
  const parsed = emailSchema.safeParse(to);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Email tidak valid" };
  }

  // encodeURIComponent: token dari layer lain bentuknya di luar kendali file
  // ini. Kalau suatu saat strategimu berubah ke format yang mengandung "+"
  // atau "/", link-nya tetap valid tanpa file ini perlu tahu.
  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  try {
    // SDK Resend sendiri juga return { data, error } alih-alih throw untuk
    // error API (rate limit, domain belum verified, dst) — throw hanya untuk
    // kegagalan network. Makanya dua-duanya harus ditangani: cek `error` DAN
    // bungkus try-catch.
    const { error } = await resend.emails.send({
      from: FROM,
      to: parsed.data,
      subject: "Verifikasi email kamu — ZazStore",
      html: buildVerificationHtml(verifyUrl),
      // Versi plain text disertakan: spam filter menaruh curiga pada email
      // yang HTML-only, dan sebagian mail client menampilkan text.
      text: `Verifikasi email kamu dengan membuka link berikut:\n\n${verifyUrl}\n\nAbaikan email ini jika kamu tidak mendaftar di ZazStore.`,
    });

    if (error) {
      // Pesan error Resend aman di-log tapi jangan diteruskan mentah ke user
      // (bisa bocorkan detail internal). Log untuk debugging, return pesan generik.
      console.error("Resend error:", error);
      return { ok: false, error: "Gagal mengirim email verifikasi" };
    }

    return { ok: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { ok: false, error: "Gagal mengirim email verifikasi" };
  }
}

// KENAPA inline style, bukan CSS class / Tailwind: mail client (terutama
// Gmail & Outlook) strip <style> dan tidak kenal class eksternal. Inline
// style adalah satu-satunya cara yang render konsisten di email.
function buildVerificationHtml(verifyUrl: string): string {
  return `
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <h2 style="margin:0 0 16px;font-size:20px;">Verifikasi email kamu</h2>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#444;">
    Terima kasih sudah mendaftar di <strong>ZazStore</strong>.
    Klik tombol di bawah untuk memverifikasi alamat email kamu.
  </p>
  <a href="${verifyUrl}"
     style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
    Verifikasi Email
  </a>
  <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#888;">
    Atau salin link ini ke browser:<br>
    <a href="${verifyUrl}" style="color:#2563eb;word-break:break-all;">${verifyUrl}</a>
  </p>
  <p style="margin:16px 0 0;font-size:12px;color:#888;">
    Jika kamu tidak merasa mendaftar, abaikan email ini.
  </p>
</div>`;
}
