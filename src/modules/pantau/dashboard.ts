import type { Payload } from 'payload'

import { urlAdmin } from '@/lib/admin'
import { HARI } from '@/modules/indexer/aturan'
import { LABEL_LANGKAH, LABEL_STATUS_INDEKS, LABEL_STATUS_LOG, STATUS_INDEKS, type StatusIndeks, type StatusLog } from '@/modules/indexer/tipe'

import { batasPindaiManual, geserTanggal, HARI_RINGKASAN, ringkasSebelumnya, ringkasSitus, tanggalPasifik, type RingkasanSitus } from './aturan'
import type { KoleksiSumber, Sumber } from './tautan'
import { JENIS_TUGAS, type JenisTugas, type RingkasanHalaman, type StatusTugas } from './tipe'

/** Batas baris tiap bagian dashboard; daftar lengkap tetap di koleksinya. */
export const MAKS_HALAMAN_DASHBOARD = 20
export const MAKS_LOG_DASHBOARD = 8
export const MAKS_404_DASHBOARD = 10
export const MAKS_TEMUAN_DASHBOARD = 50

export type InfoTugas = { status: StatusTugas | null; pesan: string | null; mulai: string | null; selesai: string | null; berikutnya: string }

export type TautanSumber = { judul: string; href: string }

export type TautanBermasalah = {
  /** `rusak` dan `dialihkan`: tautan internal; `luar-rusak` dan `luar-cek`: tautan ke situs lain. */
  jenis: 'rusak' | 'luar-rusak' | 'dialihkan' | 'luar-cek'
  tujuan: string
  pesan: string
  sumber: TautanSumber[]
}

export type DataDashboard = {
  tugas: Record<JenisTugas, InfoTugas | null>
  /** Tombol "Pindai ulang sekarang": boleh, atau kenapa belum dan kapan boleh lagi (ISO). */
  pindai: { boleh: true } | { boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: string }
  analitik: {
    sampai: string | null
    /** Panjang ringkasan dan grafik (7, 28, atau 90 hari). */
    periode: number
    situs: RingkasanSitus | null
    /** Periode sebelumnya untuk perbandingan, `null` bila datanya belum lengkap. */
    sebelumnya: Omit<RingkasanSitus, 'seri'> | null
    halaman: RingkasanHalaman[]
    jumlahHalaman: number
  }
  statusIndeks: { status: StatusIndeks; label: string; jumlah: number }[]
  log: {
    gagal7Hari: number
    terbaru: { id: number; waktu: string; url: string; langkah: string; status: StatusLog; labelStatus: string; pesan: string | null }[]
  }
  tautan: TautanBermasalah[]
  yatim: { path: string; judul: string; href: string }[]
  log404: { path: string; jumlah: number; terakhir: string | null; redirect: string | null }[]
}

/** Halaman admin untuk memperbaiki sumber tautan: dokumen koleksi, atau global menu dan beranda. */
export function hrefSumber(s: Pick<Sumber, 'koleksi' | 'id'>): string {
  const global: Partial<Record<KoleksiSumber, string>> = { header: 'header', footer: 'footer', beranda: 'beranda' }
  const slug = global[s.koleksi]
  return slug ? urlAdmin.global(slug) : urlAdmin.dokumen(s.koleksi, s.id ?? '')
}

const URUTAN_TAUTAN: TautanBermasalah['jenis'][] = ['rusak', 'luar-rusak', 'dialihkan', 'luar-cek']

/**
 * Semua data dashboard SEO (spesifikasi §8 "Dashboard SEO") dalam satu panggilan: ringkasan Search
 * Console 28 hari dan halaman teratas, ringkasan status indeks, log indexing terbaru dan jumlah langkah
 * gagal 7 hari, tautan rusak, halaman yatim, 404 teratas, dan status tugas harian. Hanya membaca; tugas
 * berkala yang mengisi datanya.
 */
export async function ambilDashboard(payload: Payload, sekarang = new Date(), periode = HARI_RINGKASAN): Promise<DataDashboard> {
  const { docs: tugasDocs } = await payload.find({ collection: 'tugas-seo', depth: 0, limit: JENIS_TUGAS.length, pagination: false })
  const tugas = Object.fromEntries(
    JENIS_TUGAS.map((jenis) => {
      const d = tugasDocs.find((t) => t.jenis === jenis)
      return [jenis, d ? { status: d.status ?? null, pesan: d.pesan ?? null, mulai: d.mulai ?? null, selesai: d.selesai ?? null, berikutnya: d.berikutnya } : null]
    }),
  ) as Record<JenisTugas, InfoTugas | null>

  const { docs: hari } = await payload.find({
    collection: 'analitik-situs',
    where: { tanggal: { greater_than_equal: geserTanggal(tanggalPasifik(sekarang), -(2 * periode + 17)) } },
    sort: 'tanggal',
    depth: 0,
    limit: 2 * periode + 30,
    pagination: false,
  })
  const sampai = hari.at(-1)?.tanggal ?? null
  const hariSitus = hari.map(({ tanggal, klik, impresi, ctr, posisi }) => ({ tanggal, klik, impresi, ctr, posisi }))
  const halaman = await payload.find({ collection: 'analitik-halaman', sort: ['-klik28', '-impresi28', 'path'], depth: 0, limit: MAKS_HALAMAN_DASHBOARD })

  const statusIndeks = []
  for (const status of STATUS_INDEKS) {
    const { totalDocs } = await payload.count({ collection: 'status-indeks', where: { status: { equals: status } } })
    if (totalDocs) statusIndeks.push({ status, label: LABEL_STATUS_INDEKS[status], jumlah: totalDocs })
  }
  statusIndeks.sort((a, b) => b.jumlah - a.jumlah)

  const { totalDocs: gagal7Hari } = await payload.count({
    collection: 'log-indexing',
    where: { and: [{ status: { equals: 'gagal' } }, { waktu: { greater_than_equal: new Date(sekarang.getTime() - 7 * HARI).toISOString() } }] },
  })
  const { docs: log } = await payload.find({ collection: 'log-indexing', sort: '-waktu', depth: 0, limit: MAKS_LOG_DASHBOARD, pagination: false })

  const { docs: temuan } = await payload.find({ collection: 'temuan-tautan', sort: ['jenis', 'tujuan'], depth: 0, limit: MAKS_TEMUAN_DASHBOARD * 3, pagination: false })
  const { docs: luar } = await payload.find({
    collection: 'tautan-luar',
    where: { status: { in: ['rusak', 'tidak-pasti'] } },
    sort: 'url',
    depth: 0,
    limit: MAKS_TEMUAN_DASHBOARD,
    pagination: false,
  })
  const sumberTemuan = (t: (typeof temuan)[number]): TautanSumber => ({
    judul: t.sumberJudul,
    href: hrefSumber({ koleksi: t.sumberKoleksi as KoleksiSumber, id: t.sumberId ?? null }),
  })
  const tautan: TautanBermasalah[] = [
    ...temuan
      .filter((t) => t.jenis !== 'yatim')
      .map((t) => ({ jenis: t.jenis as 'rusak' | 'dialihkan', tujuan: t.tujuan, pesan: t.pesan, sumber: [sumberTemuan(t)] })),
    ...luar.map((l) => ({
      jenis: l.status === 'rusak' ? ('luar-rusak' as const) : ('luar-cek' as const),
      tujuan: l.url,
      pesan: l.pesan ?? '',
      sumber: (Array.isArray(l.sumber) ? (l.sumber as Sumber[]) : []).map((s) => ({ judul: s.judul, href: hrefSumber(s) })),
    })),
  ]
    .sort((a, b) => URUTAN_TAUTAN.indexOf(a.jenis) - URUTAN_TAUTAN.indexOf(b.jenis))
    .slice(0, MAKS_TEMUAN_DASHBOARD)

  const { docs: log404 } = await payload.find({ collection: 'log-404', sort: ['-jumlah', '-terakhir'], depth: 0, limit: MAKS_404_DASHBOARD, pagination: false })
  const { docs: redirect } = await payload.find({
    collection: 'redirect',
    where: { dari: { in: log404.map((l) => l.path) } },
    depth: 0,
    limit: MAKS_404_DASHBOARD,
    pagination: false,
    select: { dari: true },
  })

  const pindai = batasPindaiManual(tugas.tautan, sekarang)

  return {
    tugas,
    pindai: pindai.boleh ? pindai : { ...pindai, bolehLagi: pindai.bolehLagi.toISOString() },
    analitik: {
      sampai,
      periode,
      situs: sampai ? ringkasSitus(hariSitus, sampai, periode) : null,
      sebelumnya: sampai ? ringkasSebelumnya(hariSitus, sampai, periode) : null,
      halaman: halaman.docs.map(({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28 }) => ({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28 })),
      jumlahHalaman: halaman.totalDocs,
    },
    statusIndeks,
    log: {
      gagal7Hari,
      terbaru: log.map((l) => ({
        id: l.id,
        waktu: l.waktu,
        url: l.url,
        langkah: LABEL_LANGKAH[l.langkah],
        status: l.status,
        labelStatus: LABEL_STATUS_LOG[l.status],
        pesan: l.pesan ?? null,
      })),
    },
    tautan,
    yatim: temuan
      .filter((t) => t.jenis === 'yatim')
      .slice(0, MAKS_TEMUAN_DASHBOARD)
      .map((t) => ({ path: t.tujuan, judul: t.sumberJudul, href: sumberTemuan(t).href })),
    log404: log404.map((l) => {
      const r = redirect.find((d) => d.dari === l.path)
      return { path: l.path, jumlah: l.jumlah ?? 0, terakhir: l.terakhir ?? null, redirect: r ? urlAdmin.dokumen('redirect', r.id) : null }
    }),
  }
}
