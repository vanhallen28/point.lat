import { createSign } from 'crypto'

/**
 * Otorisasi akun layanan Google tanpa pustaka (dokumentasi "Using OAuth 2.0 for Server to Server
 * Applications"): JWT RS256 ditandatangani kunci privat akun layanan, ditukar dengan token akses di
 * `oauth2.googleapis.com/token`. Token disimpan sampai satu menit sebelum kedaluwarsa.
 */

export const URL_TOKEN = 'https://oauth2.googleapis.com/token'
export const SCOPE_WEBMASTERS = 'https://www.googleapis.com/auth/webmasters'
export const SCOPE_INDEXING = 'https://www.googleapis.com/auth/indexing'

/** Bagian file kunci JSON akun layanan yang dipakai. */
export type AkunLayanan = { client_email: string; private_key: string }

/** Isi env `GOOGLE_SERVICE_ACCOUNT_JSON` (seluruh file kunci JSON), atau alasan bila tidak bisa dipakai. */
export function bacaAkunLayanan(teks: string | undefined): AkunLayanan | { alasan: string } {
  if (!teks?.trim()) return { alasan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' }
  try {
    const data = JSON.parse(teks) as Partial<AkunLayanan>
    if (typeof data.client_email === 'string' && typeof data.private_key === 'string' && data.private_key.includes('PRIVATE KEY')) {
      return { client_email: data.client_email, private_key: data.private_key }
    }
  } catch {
    // jatuh ke pesan di bawah
  }
  return { alasan: 'GOOGLE_SERVICE_ACCOUNT_JSON bukan file kunci JSON akun layanan (client_email dan private_key tidak ditemukan).' }
}

const base64url = (teks: string) => Buffer.from(teks).toString('base64url')

/** JWT untuk permintaan token: berlaku 1 jam (batas maksimal Google) sejak `iat` (detik). */
export function buatJwt(akun: AkunLayanan, scope: string, iat: number): string {
  const kepala = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const klaim = base64url(JSON.stringify({ iss: akun.client_email, scope, aud: URL_TOKEN, iat, exp: iat + 3600 }))
  const tanda = createSign('RSA-SHA256').update(`${kepala}.${klaim}`).sign(akun.private_key).toString('base64url')
  return `${kepala}.${klaim}.${tanda}`
}

export type Fetch = typeof fetch

/** Batas tunggu setiap permintaan ke layanan luar. */
export const BATAS_TUNGGU_MS = 15_000

export type PenyediaToken = (scope: string) => Promise<{ token: string } | { galat: string; kodeHttp: number | null }>

/** Penyedia token akses per scope dengan cache dalam memori proses. */
export function penyediaToken(akun: AkunLayanan, opsi: { fetch: Fetch; sekarang?: () => number }): PenyediaToken {
  const sekarang = opsi.sekarang ?? Date.now
  const simpanan = new Map<string, { token: string; sampai: number }>()
  return async (scope) => {
    const ada = simpanan.get(scope)
    if (ada && ada.sampai > sekarang()) return { token: ada.token }
    const iat = Math.floor(sekarang() / 1000)
    try {
      const jawaban = await opsi.fetch(URL_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: buatJwt(akun, scope, iat) }).toString(),
        signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
      })
      const data = (await jawaban.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
      if (!jawaban.ok || !data.access_token) {
        const sebab = [data.error, data.error_description?.replace(/\.$/, '')].filter(Boolean).join(': ')
        return { galat: `Google menolak akun layanan (${jawaban.status}${sebab ? ` ${sebab}` : ''}). Periksa isi GOOGLE_SERVICE_ACCOUNT_JSON.`, kodeHttp: jawaban.status }
      }
      simpanan.set(scope, { token: data.access_token, sampai: sekarang() + ((data.expires_in ?? 3600) - 60) * 1000 })
      return { token: data.access_token }
    } catch (galat) {
      return { galat: `Tidak bisa meminta token Google: ${(galat as Error).message}.`, kodeHttp: null }
    }
  }
}
