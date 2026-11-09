import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Bagian404, BagianSearchConsole, BagianTautan, BagianYatim } from '@/modules/pantau/admin/BagianDashboard'
import { ringkasSitus } from '@/modules/pantau/aturan'
import type { DataDashboard, InfoTugas } from '@/modules/pantau/dashboard'

// Tombol Pindai ulang sekarang (komponen klien) memakai router App Router untuk menyegarkan dashboard.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

/** Teks yang terlihat: tag dibuang, spasi biasa dirapikan (spasi tak putus dari `Intl` dipertahankan). */
const teks = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim()

const KOSONG: DataDashboard['analitik'] = { sampai: null, periode: 28, situs: null, sebelumnya: null, halaman: [], jumlahHalaman: 0 }
const info = (status: InfoTugas['status'], pesan: string): InfoTugas => ({
  status,
  pesan,
  mulai: '2026-11-05T02:59:00.000Z',
  selesai: '2026-11-05T03:00:00.000Z',
  berikutnya: '2026-11-05T04:00:00.000Z',
})
const tugas = (analitik: InfoTugas | null, tautan: InfoTugas | null = null): DataDashboard['tugas'] => ({ analitik, tautan })
const sc = (analitik: DataDashboard['analitik'], t: DataDashboard['tugas']) => renderToStaticMarkup(h(BagianSearchConsole, { analitik, tugas: t }))

describe('keadaan dashboard SEO', () => {
  it('Search Console belum pernah disinkron: jadwalnya dijelaskan, tanpa angka nol palsu', () => {
    const html = teks(sc(KOSONG, tugas(null)))
    expect(html).toContain('Sinkron Search Console: belum pernah berjalan. Cron menjalankannya sekali sehari.')
    expect(html).toContain('Belum ada data Search Console. Data tampil di sini setelah sinkron harian berhasil.')
    expect(html).toContain('Belum ada halaman yang muncul di hasil Google.')
    expect(html).not.toContain('Posisi rata-rata')
  })

  it('dilewati (akun layanan belum diatur atau adapter palsu): alasan dan tautan ke Status pemasangan', () => {
    const html = sc(KOSONG, tugas(info('dilewati', 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).')))
    expect(teks(html)).toContain(
      'Belum ada data Search Console. Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong). Periksa Status pemasangan di Pengaturan SEO .',
    )
    expect(html).toContain('<a href="/admin/globals/pengaturan-seo">Status pemasangan di Pengaturan SEO</a>')
  })

  it('gagal: kotak galat dengan penyebab dan jadwal coba lagi; berhasil tanpa data: domain baru', () => {
    const gagal = sc(KOSONG, tugas(info('gagal', 'Google menjawab 403: User does not have sufficient permission for site.')))
    expect(gagal).toMatch(/<div class="pantau-pesan pantau-pesan--galat">/)
    expect(teks(gagal)).toContain(
      'Sinkron Search Console gagal. Google menjawab 403: User does not have sufficient permission for site. Dicoba lagi 5 Nov 2026, 11.00 WIB.',
    )
    expect(teks(sc(KOSONG, tugas(info('berhasil', 'Search Console belum punya data final untuk 35 hari terakhir.'))))).toContain(
      'Search Console belum punya data untuk situs ini.',
    )
  })

  it('terisi: empat kartu angka, grafik dengan teks alternatif, dan tabel halaman teratas', () => {
    const situs = ringkasSitus([{ tanggal: '2026-11-02', klik: 1284, impresi: 182_400, ctr: 0.007, posisi: 6.43 }], '2026-11-02')
    const html = sc(
      {
        sampai: '2026-11-02',
        periode: 28,
        situs,
        sebelumnya: null,
        halaman: [{ path: '/cara-hitung-thr', klik7: 30, impresi7: 900, klik28: 1284, impresi28: 182_400, ctr28: 0.007, posisi28: 6.43 }],
        jumlahHalaman: 41,
      },
      tugas(info('berhasil', 'Data sampai 2026-11-02.')),
    )
    expect(teks(html)).toContain(
      'Klik 1.284 belum cukup data Impresi 182,4\u00a0rb belum cukup data CTR 0,7% belum cukup data Posisi rata-rata 6,4 belum cukup data',
    )
    expect(teks(html)).toContain('28 hari sampai 2 Nov 2026, dibanding 28 hari sebelumnya.')
    expect(html).toContain('aria-label="Klik per hari, 6 Okt 2026 sampai 2 Nov 2026: total 1.284, tertinggi 1.284 pada 2 Nov 2026."')
    expect(teks(html)).toContain('/cara-hitung-thr 1.284 182.400 0,7% 6,4 30')
    expect(teks(html)).toContain('Menampilkan 1 dari 41 halaman yang muncul di Google.')
  })

  it('periode dengan data sebelumnya: perubahan bertanda +/- dan panah; posisi yang mengecil ditandai membaik', () => {
    const situs = ringkasSitus([{ tanggal: '2026-11-02', klik: 1284, impresi: 182_400, ctr: 0.007, posisi: 6.43 }], '2026-11-02', 7)
    const html = sc(
      {
        sampai: '2026-11-02',
        periode: 7,
        situs,
        sebelumnya: { klik: 1000, impresi: 200_000, ctr: 0.005, posisi: 7 },
        halaman: [],
        jumlahHalaman: 0,
      },
      tugas(info('berhasil', 'Data sampai 2026-11-02.')),
    )
    expect(teks(html)).toContain('7 hari sampai 2 Nov 2026, dibanding 7 hari sebelumnya.')
    expect(teks(html)).toContain('Klik 1.284 +28% dibanding periode sebelumnya')
    expect(teks(html)).toContain('Impresi 182,4\u00a0rb -9% dibanding periode sebelumnya')
    // Posisi 7 ke 6,4: angkanya turun, artinya membaik (kelas naik, warna hijau).
    expect(html).toMatch(/redaksi-perubahan--naik"[^>]*title="Periode sebelumnya: 7,0 "/)
  })

  it('tautan rusak, halaman yatim, dan 404: daftar dengan tautan perbaikan, atau keadaan kosong yang jelas', () => {
    const t = tugas(null, info('berhasil', '12 tautan dipindai.'))
    const rusak = renderToStaticMarkup(
      h(BagianTautan, {
        tautan: [{ jenis: 'rusak', tujuan: '/tidak-ada', pesan: 'Tidak ada halaman.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] }],
        tugas: t,
        pindai: { boleh: true },
      }),
    )
    expect(teks(rusak)).toContain('Rusak /tidak-ada Tidak ada halaman. Ada di Cara hitung THR')
    expect(teks(renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: true } })))).toContain('Tidak ada tautan rusak di konten terbit.')
    expect(teks(renderToStaticMarkup(h(BagianYatim, { yatim: [], tugas: tugas(null) })))).toContain('Belum dipindai. Pindai tautan berjalan otomatis sekali sehari.')
    expect(teks(renderToStaticMarkup(h(BagianYatim, { yatim: [], tugas: t })))).toContain('Semua artikel dan halaman terbit sudah punya tautan masuk.')
    const log404 = renderToStaticMarkup(h(Bagian404, { log404: [{ path: '/jalan-lama', jumlah: 3, terakhir: null, redirect: null }] }))
    expect(log404).toContain('<a href="/admin/collections/redirect/create?dari=%2Fjalan-lama" aria-label="Buat redirect untuk /jalan-lama">Buat redirect</a>')
    expect(teks(renderToStaticMarkup(h(Bagian404, { log404: [] })))).toContain('Belum ada kunjungan ke halaman yang tidak ada.')
  })

  it('tombol "Pindai ulang sekarang": siap, atau dibatasi dengan alasan dan waktu boleh lagi yang dibacakan role="status"', () => {
    const t = tugas(null, info('berhasil', '12 tautan dipindai.'))
    const siap = renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: true } }))
    expect(siap).toMatch(/<button type="button" class="pantau-aksi__tombol" aria-disabled="false">Pindai ulang sekarang<\/button><p role="status" class="pantau-aksi__pesan"><\/p>/)
    const jeda = renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: false, alasan: 'jeda', bolehLagi: '2026-11-05T03:09:00.000Z' } }))
    expect(jeda).toContain('aria-disabled="true"')
    expect(teks(jeda)).toContain('Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai 5 Nov 2026, 10.09 WIB.')
    const berjalan = renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: false, alasan: 'berjalan', bolehLagi: '2026-11-05T03:14:00.000Z' } }))
    expect(teks(berjalan)).toContain('Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.')
  })
})
