import type { PayloadRequest } from 'payload'

/**
 * Penjaga endpoint aksi admin (`POST` dari tombol di admin, misalnya "Cek sekarang"): hanya admin yang
 * masuk, dan hanya dari halaman situs sendiri. Cookie login Payload ber-SameSite Lax sehingga browser tidak
 * mengirimnya pada `POST` dari situs lain; `Sec-Fetch-Site` menolak sisanya (misalnya subdomain lain).
 * Klien tanpa header itu (skrip, tes) tetap butuh login admin. `null` berarti boleh lanjut.
 */
export function tolakSelainAdmin(req: PayloadRequest): Response | null {
  const galat = (status: number, pesan: string) => Response.json({ status: 'gagal', pesan }, { status })
  if (!req.user) return galat(401, 'Masuk dulu sebagai admin.')
  if ((req.user as { peran?: string | null }).peran !== 'admin') return galat(403, 'Hanya admin yang bisa menjalankan aksi ini.')
  const asal = req.headers.get('sec-fetch-site')
  if (asal && asal !== 'same-origin') return galat(403, 'Permintaan dari situs lain ditolak.')
  return null
}
