/**
 * Header keamanan untuk semua jawaban (halaman publik ISR, admin Payload, API, rute teknis), dipasang lewat
 * `headers()` di `next.config.ts` supaya halaman publik tetap statis: header ditambahkan CDN, bukan dibaca
 * atau ditulis saat render.
 *
 * - HSTS tidak ditulis di sini: Vercel mengirim `Strict-Transport-Security: max-age=63072000` untuk domain
 *   sendiri dan mengalihkan HTTP ke HTTPS (308). `includeSubDomains` dan `preload` keputusan pemilik nanti,
 *   karena berlaku untuk semua subdomain `point.lat` (misalnya domain pelacak tautan penyedia newsletter).
 * - CSP hanya arahan yang tidak menyentuh skrip. AdSense hanya mendukung CSP ketat dengan nonce per
 *   permintaan, dan nonce membuat semua halaman dirender per permintaan (tanpa ISR dan cache CDN).
 * - `Permissions-Policy` hanya mematikan fitur perangkat yang tidak dipakai situs dan iklan; API privasi
 *   iklan (Topics, Attribution Reporting, Protected Audience) dibiarkan karena dipakai AdSense.
 */

export type HeaderJawaban = { key: string; value: string }

/** Arahan CSP yang ditegakkan: tanpa `<base>` asing, tanpa plugin, hanya dibingkai situs sendiri, form ke situs sendiri. */
export const KEBIJAKAN_KONTEN = ["base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'", "form-action 'self'"].join('; ')

export const HEADER_KEAMANAN: HeaderJawaban[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Content-Security-Policy', value: KEBIJAKAN_KONTEN },
]
