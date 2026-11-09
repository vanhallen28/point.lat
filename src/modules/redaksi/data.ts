import type { Payload, Where } from 'payload'

import { PATH_ADMIN, urlAdmin } from '@/lib/admin'
import { pathFor } from '@/lib/paths'
import { bulanJakarta } from '@/modules/ai/aturan'
import { terpakaiBulan } from '@/modules/ai/anggaran'
import { LABEL_STATUS_INDEKS, STATUS_INDEKS, type StatusIndeks } from '@/modules/indexer/tipe'
import { geserTanggal, tanggalPasifik } from '@/modules/pantau/aturan'
import { BUTIR_REVIEW } from '@/modules/ai/review'

import { awalPekanJakarta, chipIndeks, jumlahPeriode, klikPerPekan, susunKalender, urutkanPerhatian, type ArtikelKalender } from './aturan'
import type { DataRuangRedaksi, ItemPerhatian, PilarRingkas } from './tipe'

const HARI_MS = 86_400_000

/** Jumlah baris artikel yang dibaca untuk kalender (terbit dan terjadwal tiga pekan, draf terbaru). */
const MAKS_ARTIKEL_KALENDER = 200
const MAKS_DRAF_KALENDER = 60
const JUMLAH_TERBIT_TERBARU = 6

type Pengguna = { nama?: string | null; email?: string | null; peran?: string | null }

/** URL daftar admin dengan saringan (`?where[...]`), supaya baris "Perlu perhatian" membuka daftar yang tepat. */
function daftarTersaring(koleksi: string, saring: Record<string, string>): string {
  const kueri = new URLSearchParams(saring).toString()
  return `${urlAdmin.daftar(koleksi)}${kueri ? `?${kueri}` : ''}`
}

const pilarRingkas = (p: unknown): PilarRingkas | null =>
  p && typeof p === 'object' ? { id: (p as { id: number }).id, nama: (p as { nama: string }).nama, warna: (p as { warna?: string | null }).warna ?? null } : null

/**
 * Semua data beranda admin dalam satu panggilan (spesifikasi §23). Hanya membaca database point.; Google tidak
 * dipanggil. Editor mendapat bagian konten saja: Search Console, status indeks, kesehatan situs, anggaran AI, dan
 * temuan SEO dikosongkan karena koleksinya hanya bisa dibaca admin.
 */
export async function ambilRuangRedaksi(
  payload: Payload,
  pengguna: Pengguna,
  opsi: { sekarang?: Date; periode?: number } = {},
): Promise<DataRuangRedaksi> {
  const sekarang = opsi.sekarang ?? new Date()
  const periode = opsi.periode ?? 7
  const admin = pengguna.peran === 'admin'
  const awalPekan = awalPekanJakarta(sekarang)
  const iso = (t: number) => new Date(t).toISOString()
  const terbitWhere: Where = { _status: { equals: 'published' } }

  // Artikel: hitungan, jadwal terbit (job `schedulePublish` Payload yang belum selesai), dan kalender.
  const [terbit, draf, terbitPekanIni, pilarDocs, jobs] = await Promise.all([
    payload.count({ collection: 'artikel', where: terbitWhere, overrideAccess: true }),
    payload.count({ collection: 'artikel', where: { _status: { equals: 'draft' } }, overrideAccess: true }),
    payload.count({ collection: 'artikel', where: { and: [terbitWhere, { terbitPada: { greater_than_equal: awalPekan.toISOString() } }] }, overrideAccess: true }),
    payload.find({ collection: 'pilar', sort: ['urutan', 'nama'], depth: 0, limit: 50, overrideAccess: true, select: { nama: true, warna: true } }),
    payload.find({
      collection: 'payload-jobs',
      where: { and: [{ taskSlug: { equals: 'schedulePublish' } }, { completedAt: { exists: false } }] },
      depth: 0,
      limit: 200,
      overrideAccess: true,
    }),
  ])
  const jadwal = new Map<string, string>()
  for (const j of jobs.docs) {
    const masukan = j.input as { type?: string; doc?: { relationTo?: string; value?: number | string } } | null
    if (masukan?.type === 'publish' && masukan.doc?.relationTo === 'artikel' && masukan.doc.value != null && j.waitUntil) {
      jadwal.set(String(masukan.doc.value), j.waitUntil)
    }
  }

  const pilihArtikel = { judul: true, slug: true, tipe: true, pilar: true, _status: true, terbitPada: true, updatedAt: true } as const
  const [terbitKalender, drafKalender] = await Promise.all([
    payload.find({
      collection: 'artikel',
      where: { and: [terbitWhere, { terbitPada: { greater_than_equal: iso(awalPekan.getTime() - 7 * HARI_MS) } }] },
      sort: '-terbitPada',
      depth: 0,
      limit: MAKS_ARTIKEL_KALENDER,
      overrideAccess: true,
      select: pilihArtikel,
    }),
    payload.find({
      collection: 'artikel',
      where: { _status: { equals: 'draft' } },
      sort: '-updatedAt',
      depth: 0,
      limit: MAKS_DRAF_KALENDER,
      overrideAccess: true,
      select: pilihArtikel,
    }),
  ])
  const artikelKalender: ArtikelKalender[] = [
    ...terbitKalender.docs.map((a) => ({
      id: a.id,
      judul: a.judul,
      href: urlAdmin.dokumen('artikel', a.id),
      pilar: (a.pilar as number | null) ?? null,
      keadaan: 'terbit' as const,
      waktu: a.terbitPada ?? null,
    })),
    ...drafKalender.docs.map((a) => {
      const waktuJadwal = jadwal.get(String(a.id))
      return {
        id: a.id,
        judul: a.judul,
        href: urlAdmin.dokumen('artikel', a.id),
        pilar: (a.pilar as number | null) ?? null,
        keadaan: waktuJadwal ? ('terjadwal' as const) : ('draf' as const),
        waktu: waktuJadwal ?? a.updatedAt,
      }
    }),
  ]
  const kalender = susunKalender(
    artikelKalender,
    pilarDocs.docs.map((p) => p.id),
    sekarang,
  )
  const jumlahTerbitPilar = await Promise.all(
    pilarDocs.docs.map((p) => payload.count({ collection: 'artikel', where: { and: [terbitWhere, { pilar: { equals: p.id } }] }, overrideAccess: true })),
  )

  // Terbit terbaru.
  const terbaru = await payload.find({
    collection: 'artikel',
    where: terbitWhere,
    sort: '-terbitPada',
    depth: 1,
    limit: JUMLAH_TERBIT_TERBARU,
    overrideAccess: true,
    select: { judul: true, slug: true, tipe: true, pilar: true, terbitPada: true },
    populate: { pilar: { nama: true, warna: true } },
  })
  const pathTerbaru = terbaru.docs.map((a) => pathFor({ jenis: 'artikel', slug: a.slug ?? '', tipe: a.tipe }))

  // Pesan masuk dan review AI: untuk admin dan editor.
  const reviewBelum: Where = {
    and: [
      { pakaiDrafAi: { equals: true } },
      { _status: { equals: 'draft' } },
      { or: BUTIR_REVIEW.map((b) => ({ [`reviewAi.${b.name}`]: { not_equals: true } })) },
    ],
  }
  const [pesanBaru, aiBelum] = await Promise.all([
    payload.count({ collection: 'pesan-masuk', where: { status: { equals: 'baru' } }, overrideAccess: true }),
    payload.count({ collection: 'artikel', where: reviewBelum, overrideAccess: true }),
  ])
  const perhatian: ItemPerhatian[] = [
    {
      kunci: 'pesan',
      label: 'Pesan masuk belum dibaca',
      keterangan: 'Koreksi, hak jawab, dan kerja sama',
      jumlah: pesanBaru.totalDocs,
      tingkat: 'segera',
      href: daftarTersaring('pesan-masuk', { 'where[status][equals]': 'baru' }),
    },
    {
      kunci: 'review-ai',
      label: 'Artikel AI belum direview',
      keterangan: 'Tombol terbit terkunci sampai checklist lengkap',
      jumlah: aiBelum.totalDocs,
      tingkat: 'segera',
      href: daftarTersaring('artikel', { 'where[pakaiDrafAi][equals]': 'true', 'where[_status][equals]': 'draft' }),
    },
  ]

  const dasar: DataRuangRedaksi = {
    admin,
    nama: pengguna.nama?.trim() || pengguna.email || 'Redaksi',
    sekarang: sekarang.toISOString(),
    periode,
    dataSampai: null,
    layanan: null,
    google: null,
    artikel: { terbit: terbit.totalDocs, terbitPekanIni: terbitPekanIni.totalDocs, draf: draf.totalDocs, terjadwal: jadwal.size },
    indeks: null,
    kalender: {
      kolom: kalender.kolom,
      baris: kalender.baris.map((b, i) => ({
        pilar: { id: pilarDocs.docs[i].id, nama: pilarDocs.docs[i].nama, warna: pilarDocs.docs[i].warna ?? null },
        jumlahTerbit: jumlahTerbitPilar[i].totalDocs,
        sel: b.sel,
      })),
    },
    klikPekan: null,
    terbitTerbaru: terbaru.docs.map((a) => ({
      id: a.id,
      judul: a.judul,
      href: urlAdmin.dokumen('artikel', a.id),
      terbitPada: a.terbitPada ?? null,
      pilar: pilarRingkas(a.pilar),
      klik7: null,
      indeks: null,
    })),
    kesehatan: null,
    perhatian: urutkanPerhatian(perhatian),
  }
  if (!admin) return dasar

  // Bagian khusus admin: Search Console, status indeks, temuan SEO, kesehatan situs, anggaran AI.
  const tujuhHari = iso(sekarang.getTime() - 7 * HARI_MS)
  const sehari = iso(sekarang.getTime() - HARI_MS)
  const panjangData = Math.max(2 * periode, 56) + 7
  const [hari, halaman, statusPath, jumlahStatus, rusak, yatim, log404Baru, gagal7, gagal24, tugas, metaAda, asisten, terpakai] = await Promise.all([
    payload.find({
      collection: 'analitik-situs',
      where: { tanggal: { greater_than_equal: geserTanggal(tanggalPasifik(sekarang), -panjangData) } },
      sort: 'tanggal',
      depth: 0,
      limit: panjangData + 10,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({ collection: 'analitik-halaman', where: { path: { in: pathTerbaru } }, depth: 0, limit: pathTerbaru.length || 1, overrideAccess: true }),
    payload.find({ collection: 'status-indeks', where: { path: { in: pathTerbaru } }, depth: 0, limit: pathTerbaru.length || 1, overrideAccess: true }),
    Promise.all(STATUS_INDEKS.map(async (s) => [s, (await payload.count({ collection: 'status-indeks', where: { status: { equals: s } }, overrideAccess: true })).totalDocs] as const)),
    payload.find({ collection: 'temuan-tautan', where: { jenis: { equals: 'rusak' } }, depth: 0, limit: 1000, pagination: false, overrideAccess: true, select: { sumberKoleksi: true, sumberId: true } }),
    payload.count({ collection: 'temuan-tautan', where: { and: [{ jenis: { equals: 'yatim' } }, { sumberKoleksi: { equals: 'artikel' } }] }, overrideAccess: true }),
    payload.count({ collection: 'log-404', where: { createdAt: { greater_than_equal: tujuhHari } }, overrideAccess: true }),
    payload.count({ collection: 'log-indexing', where: { and: [{ status: { equals: 'gagal' } }, { waktu: { greater_than_equal: tujuhHari } }] }, overrideAccess: true }),
    payload.count({ collection: 'log-indexing', where: { and: [{ status: { equals: 'gagal' } }, { waktu: { greater_than_equal: sehari } }] }, overrideAccess: true }),
    payload.find({ collection: 'tugas-seo', depth: 0, limit: 10, overrideAccess: true }),
    payload.count({
      collection: 'artikel',
      where: { and: [terbitWhere, { 'seo.metaDeskripsi': { exists: true } }, { 'seo.metaDeskripsi': { not_equals: '' } }] },
      overrideAccess: true,
    }),
    payload.findGlobal({ slug: 'asisten-ai', depth: 0, overrideAccess: true }),
    terpakaiBulan(payload, bulanJakarta(sekarang)),
  ])

  const hariSitus = hari.docs.map((h) => ({ tanggal: h.tanggal, klik: h.klik, impresi: h.impresi, ctr: h.ctr, posisi: h.posisi }))
  const sampai = hariSitus.at(-1)?.tanggal ?? null
  const status = Object.fromEntries(jumlahStatus) as Record<StatusIndeks, number>
  const totalIndeks = jumlahStatus.reduce((n, [, j]) => n + j, 0)
  const bermasalah = status.dikecualikan + status.galat
  const artikelRusak = new Set(rusak.docs.filter((t) => t.sumberKoleksi === 'artikel').map((t) => String(t.sumberId))).size
  const tugasGagal = tugas.docs.filter((t) => t.status === 'gagal')

  const klikPath = new Map(halaman.docs.map((h) => [h.path, h.klik7]))
  const statusDiPath = new Map(statusPath.docs.map((s) => [s.path, s.status as StatusIndeks]))

  dasar.dataSampai = sampai
  dasar.layanan =
    tugasGagal.length || gagal24.totalDocs
      ? {
          normal: false,
          pesan: tugasGagal.length ? `${tugasGagal.length} tugas harian gagal` : `${gagal24.totalDocs} kabar Google gagal 24 jam terakhir`,
        }
      : { normal: true, pesan: 'Semua layanan normal' }
  if (sampai) {
    const p = jumlahPeriode(hariSitus, sampai, periode)
    dasar.google = p
    dasar.klikPekan = klikPerPekan(hariSitus, sampai)
  }
  dasar.indeks = { terindeks: status.terindeks, menunggu: totalIndeks - status.terindeks - bermasalah, bermasalah, total: totalIndeks }
  dasar.terbitTerbaru = dasar.terbitTerbaru.map((a, i) => {
    const s = statusDiPath.get(pathTerbaru[i])
    const chip = chipIndeks(s)
    return { ...a, klik7: klikPath.get(pathTerbaru[i]) ?? 0, indeks: chip && s ? { status: chip, label: LABEL_STATUS_INDEKS[s] } : null }
  })
  const n = terbit.totalDocs
  dasar.kesehatan = {
    item: [
      { label: 'Halaman terindeks', bagian: status.terindeks, total: totalIndeks, keterangan: `${status.terindeks} dari ${totalIndeks} halaman` },
      { label: 'Artikel tanpa tautan rusak', bagian: n - artikelRusak, total: n, keterangan: `${artikelRusak} artikel punya tautan rusak` },
      { label: 'Artikel dengan meta deskripsi', bagian: metaAda.totalDocs, total: n, keterangan: `${metaAda.totalDocs} dari ${n} artikel` },
      { label: 'Artikel dengan tautan masuk', bagian: n - yatim.totalDocs, total: n, keterangan: `${yatim.totalDocs} artikel yatim` },
    ],
    anggaranAi: { terpakai, batas: Number(asisten.anggaranBulanan ?? 0) },
  }
  dasar.perhatian = urutkanPerhatian([
    ...perhatian,
    {
      kunci: 'tautan-rusak',
      label: 'Tautan rusak',
      keterangan: 'Dari pindai tautan harian',
      jumlah: rusak.docs.length,
      tingkat: 'pekan',
      href: `${PATH_ADMIN}/seo#tautan-rusak`,
    },
    {
      kunci: '404',
      label: '404 baru pekan ini',
      keterangan: 'Buat redirect dari Log 404',
      jumlah: log404Baru.totalDocs,
      tingkat: 'pekan',
      href: daftarTersaring('log-404', { 'where[createdAt][greater_than_equal]': tujuhHari }),
    },
    {
      kunci: 'indexing-gagal',
      label: 'Kabar ke Google gagal',
      keterangan: '7 hari terakhir',
      jumlah: gagal7.totalDocs,
      tingkat: 'segera',
      href: daftarTersaring('log-indexing', { 'where[status][equals]': 'gagal' }),
    },
  ])
  return dasar
}
