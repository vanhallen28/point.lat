import { CONTOH_ENV } from './aturan'

/**
 * Password pengguna admin di lingkungan terbuka (deploy produksi dan pratinjau, atau database Supabase).
 * Mengikuti NIST SP 800-63B-4: password sebagai satu-satunya faktor minimal 15 karakter, diperiksa terhadap
 * daftar tolak (nilai contoh dan kata yang terkait layanan atau akun), tanpa aturan komposisi (huruf besar,
 * angka, simbol) dan tanpa batas panjang yang rendah.
 */

export const MIN_PASSWORD = 15

/** Kata yang mudah ditebak untuk akun admin situs ini (daftar tolak konteks). */
export const KATA_DITOLAK = ['point', 'password', 'admin', 'qwerty', '123456'] as const

/** `true` bila password boleh dipakai, atau pesan yang menjelaskan cara memperbaikinya. */
export function periksaPassword(password: string, opsi: { email?: string | null } = {}): true | string {
  if (password === CONTOH_ENV.SEED_ADMIN_PASSWORD) return 'Password ini contoh dari .env.example. Buat password baru.'
  if (password.length < MIN_PASSWORD) {
    return `Password minimal ${MIN_PASSWORD} karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.`
  }
  const kecil = password.toLowerCase()
  const namaAkun = opsi.email?.split('@')[0]?.toLowerCase() ?? ''
  const ditolak = [...KATA_DITOLAK, ...(namaAkun.length >= 4 ? [namaAkun] : [])].find((kata) => kecil.includes(kata))
  if (ditolak) return `Password tidak boleh memuat "${ditolak}". Pakai kata yang tidak berhubungan dengan situs atau akunmu.`
  if (new Set(kecil).size < 4) return 'Password terlalu mudah ditebak. Pakai frasa dengan kata yang berbeda-beda.'
  return true
}
