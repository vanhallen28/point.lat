import { describe, expect, it } from 'vitest'

import { ringkasPemasangan } from '@/modules/indexer/pemasangan'

const AKUN = JSON.stringify({ client_email: 'indexer@point-lat.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n' })

describe('ringkasPemasangan: status pemasangan di Pengaturan SEO', () => {
  it('lokal tanpa env: semua butir perlu diatur dan dijelaskan cara mengaturnya', () => {
    expect(ringkasPemasangan({}, { kunciIndexNow: null })).toEqual([
      { label: 'Pengiriman', siap: false, teks: 'Palsu: tidak ada yang dikirim ke luar. Isi INDEXER_ADAPTER=asli di env produksi Vercel.' },
      { label: 'Akun layanan Google', siap: false, teks: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' },
      { label: 'Cron', siap: false, teks: 'CRON_SECRET belum diatur, jadi Vercel Cron ditolak. Isi minimal 16 karakter acak di env Vercel.' },
      { label: 'IndexNow', siap: false, teks: 'Kunci belum diisi, jadi IndexNow dilewati.' },
    ])
  })

  it('produksi lengkap: siap tanpa menampilkan isi rahasia', () => {
    const butir = ringkasPemasangan(
      { INDEXER_ADAPTER: 'asli', GOOGLE_SERVICE_ACCOUNT_JSON: AKUN, CRON_SECRET: 'rahasia-cron-panjang-2026' },
      { kunciIndexNow: 'kunci-point-2026' },
    )
    expect(butir.every((b) => b.siap)).toBe(true)
    expect(butir.map((b) => b.teks).join(' ')).not.toMatch(/rahasia-cron|PRIVATE KEY|iam\.gserviceaccount/)
    expect(butir[3].teks).toBe('Kunci tersimpan dan dilayani di /kunci-point-2026.txt.')
  })
})
