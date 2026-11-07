import { bacaAkunLayanan } from './google'
import { pathFileKunci } from './kunci'
import type { PengaturanIndexing } from './tipe'

export type ButirPemasangan = { label: string; siap: boolean; teks: string }

/**
 * Ringkasan pemasangan Mesin Indexing untuk admin (spesifikasi §18 "Setup dari pemilik"): mode adapter,
 * akun layanan Google, rahasia cron, dan kunci IndexNow. Hanya menyebut terpasang atau belum; isi
 * rahasia tidak pernah ditampilkan.
 */
export function ringkasPemasangan(
  env: Record<string, string | undefined>,
  pengaturan: Pick<PengaturanIndexing, 'kunciIndexNow'>,
): ButirPemasangan[] {
  const akun = bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const asli = env.INDEXER_ADAPTER === 'asli'
  return [
    {
      label: 'Pengiriman',
      siap: asli,
      teks: asli
        ? 'Asli: kabar dikirim ke Google dan IndexNow.'
        : 'Palsu: tidak ada yang dikirim ke luar. Isi INDEXER_ADAPTER=asli di env produksi Vercel.',
    },
    {
      label: 'Akun layanan Google',
      siap: !('alasan' in akun),
      teks: 'alasan' in akun ? akun.alasan : 'Terpasang. Pastikan email akun layanan menjadi pemilik (Owner) properti di Search Console.',
    },
    {
      label: 'Cron',
      siap: Boolean(env.CRON_SECRET),
      teks: env.CRON_SECRET
        ? 'CRON_SECRET terpasang. Vercel Cron menjalankan antrean sesuai jadwal di vercel.json, dan simpan atau terbit konten juga langsung menjalankannya.'
        : 'CRON_SECRET belum diatur, jadi Vercel Cron ditolak. Isi minimal 16 karakter acak di env Vercel.',
    },
    {
      label: 'IndexNow',
      siap: Boolean(pengaturan.kunciIndexNow),
      teks: pengaturan.kunciIndexNow
        ? `Kunci tersimpan dan dilayani di ${pathFileKunci(pengaturan.kunciIndexNow)}.`
        : 'Kunci belum diisi, jadi IndexNow dilewati.',
    },
  ]
}
