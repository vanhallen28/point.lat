import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import {
  benderaNegara,
  daftarTanggal,
  geserTanggal,
  LABEL_KANAL,
  LABEL_PERANGKAT,
  MAKS_PER_MENIT,
  MAKS_TAYANGAN_HARIAN,
  MENIT_ONLINE,
  namaNegara,
  PILIHAN_RENTANG,
  rentangPilihan,
  rentangSebelumnya,
  sidikKunjungan,
  SIMPAN_HARI,
  sumberKunjungan,
  tanggalWib,
  type BarisCsvKunjungan,
  type Kanal,
  type Kiriman,
  type Perangkat,
  type Rentang,
} from './aturan'
import type { Angka, AngkaBanding, BarisRincian, DataKunjungan, TitikSeri } from './tipe'

/** Potongan SQL drizzle (tipe `SQL` tidak diekspor ulang oleh @payloadcms/db-postgres). */
type SQL = ReturnType<typeof sql>
type Db = { execute: (q: SQL) => Promise<{ rows: Record<string, unknown>[] }> }

const db = (payload: Payload) => payload.db.drizzle as unknown as Db
const angka = (v: unknown) => Number(v ?? 0) || 0

/** Paling banyak baris per tabel rincian. */
export const MAKS_BARIS_RINCIAN = 10

export type KonteksKunjungan = {
  ua: string
  ip: string | null
  negara: string | null
  kota: string | null
  /** Host situs (dari `NEXT_PUBLIC_SITE_URL` dan permintaan) untuk mengenali perpindahan halaman di dalam point. */
  hostSitus: string[]
  perangkat: Perangkat
  peramban: string
}

/**
 * Mencatat satu tayangan dalam satu pernyataan SQL: baris `kunjungan` (dengan `baru` bila sidik ini belum terlihat
 * hari ini) dan tambah satu di `kunjungan-harian`. Diabaikan bila sidik yang sama sudah `MAKS_PER_MENIT` tayangan
 * semenit terakhir atau situs sudah `MAKS_TAYANGAN_HARIAN` tayangan hari itu. Mengembalikan `true` bila tercatat.
 */
export async function catatKunjungan(
  payload: Payload,
  kiriman: Kiriman,
  konteks: KonteksKunjungan,
  rahasia: string,
  sekarang = new Date(),
): Promise<boolean> {
  const tanggal = tanggalWib(sekarang)
  const waktu = sekarang.toISOString()
  const semenitLalu = new Date(sekarang.getTime() - 60_000).toISOString()
  const sidik = sidikKunjungan(konteks.ip, konteks.ua, rahasia, tanggal)
  const s = sumberKunjungan(kiriman.perujuk, kiriman.utm, konteks.hostSitus)
  const masuk = s.kanal !== 'internal'
  const { rows } = await db(payload).execute(sql`
    with batas as (
      select
        exists(select 1 from kunjungan where sidik = ${sidik} and tanggal = ${tanggal}) as ada,
        (select count(*) from kunjungan where sidik = ${sidik} and waktu > ${semenitLalu}) as menit,
        coalesce((select tayangan from kunjungan_harian where tanggal = ${tanggal}), 0) as hari
    ), baris as (
      insert into kunjungan (waktu, tanggal, path, negara, kota, kanal, sumber, perujuk, perangkat, peramban, sidik, baru, masuk, created_at, updated_at)
      select ${waktu}, ${tanggal}, ${kiriman.path}, ${konteks.negara}, ${konteks.kota}, ${s.kanal}, ${s.sumber}, ${s.perujuk},
        ${konteks.perangkat}, ${konteks.peramban}, ${sidik}, not batas.ada, ${masuk}, ${waktu}, ${waktu}
      from batas where batas.menit < ${MAKS_PER_MENIT} and batas.hari < ${MAKS_TAYANGAN_HARIAN}
      returning baru
    )
    insert into kunjungan_harian (tanggal, tayangan, pengunjung, created_at, updated_at)
    select ${tanggal}, 1, case when baris.baru then 1 else 0 end, ${waktu}, ${waktu} from baris
    on conflict (tanggal) do update set tayangan = kunjungan_harian.tayangan + 1,
      pengunjung = kunjungan_harian.pengunjung + excluded.pengunjung, updated_at = excluded.updated_at
    returning tayangan`)
  return rows.length > 0
}

/** Baris kunjungan mentah lebih dari `SIMPAN_HARI` hari dihapus (cron harian). Total harian tetap. */
export async function bersihkanKunjungan(payload: Payload, sekarang = new Date()): Promise<number> {
  const batas = geserTanggal(tanggalWib(sekarang), -SIMPAN_HARI)
  const { rows } = await db(payload).execute(sql`delete from kunjungan where tanggal < ${batas} returning id`)
  return rows.length
}

/** Jumlah tayangan dan pengunjung dari total harian untuk satu rentang. */
async function jumlahHarian(payload: Payload, dari: string, sampai: string): Promise<Angka> {
  const { rows } = await db(payload).execute(sql`
    select coalesce(sum(tayangan), 0) as tayangan, coalesce(sum(pengunjung), 0) as kunjungan
    from kunjungan_harian where tanggal >= ${dari} and tanggal <= ${sampai}`)
  return { tayangan: angka(rows[0]?.tayangan), kunjungan: angka(rows[0]?.kunjungan) }
}

/**
 * Angka rentang dan rentang sebelumnya dengan panjang sama. Hari ini (belum selesai) dibandingkan dengan kemarin
 * sampai jam yang sama, dari baris mentah, supaya pagi hari tidak selalu tampak turun.
 */
async function banding(payload: Payload, r: Rentang, waktu: Date): Promise<AngkaBanding> {
  const sekarang = await jumlahHarian(payload, r.dari, r.sampai)
  if (r.dari === r.sampai && r.sampai === tanggalWib(waktu)) {
    const kemarin = geserTanggal(r.dari, -1)
    const { rows } = await db(payload).execute(sql`
      select count(*) as tayangan, count(distinct sidik) as kunjungan from kunjungan
      where tanggal = ${kemarin} and waktu <= ${new Date(waktu.getTime() - 86_400_000).toISOString()}`)
    return { ...sekarang, sebelumnya: { tayangan: angka(rows[0]?.tayangan), kunjungan: angka(rows[0]?.kunjungan) } }
  }
  const lalu = rentangSebelumnya(r)
  return { ...sekarang, sebelumnya: lalu ? await jumlahHarian(payload, lalu.dari, lalu.sampai) : null }
}

/** Rincian satu dimensi dari baris mentah: tayangan dan kunjungan (sidik harian berbeda), urut kunjungan terbanyak. */
async function rincian(payload: Payload, kolom: SQL, r: Rentang, syarat: SQL = sql`true`, batas = MAKS_BARIS_RINCIAN) {
  const { rows } = await db(payload).execute(sql`
    select ${kolom} as kunci, count(*) as tayangan, count(distinct sidik) as kunjungan
    from kunjungan where tanggal >= ${r.dari} and tanggal <= ${r.sampai} and ${syarat}
    group by 1 order by kunjungan desc, tayangan desc, kunci asc limit ${batas}`)
  return rows.map((b) => ({ kunci: b.kunci === null ? null : String(b.kunci), tayangan: angka(b.tayangan), kunjungan: angka(b.kunjungan) }))
}

/**
 * Judul halaman untuk path di tabel rincian: beranda dan halaman indeks, artikel, glosarium, pilar, halaman statis,
 * subkategori, kalkulator, video, dan penulis. Path lain (atau dokumen yang sudah dihapus) ditampilkan apa adanya.
 */
export async function judulHalaman(payload: Payload, paths: string[]): Promise<Map<string, string>> {
  const judul = new Map<string, string>([
    ['/', 'Beranda'],
    ['/tools', 'Semua kalkulator'],
    ['/cari', 'Pencarian'],
    ['/glosarium', 'Glosarium'],
    ['/video', 'Video'],
  ])
  const segmen = paths.map((p) => p.split('/').filter(Boolean))
  const satu = [...new Set(segmen.filter((s) => s.length === 1).map((s) => s[0]))]
  const kedua = (awal: string) => [...new Set(segmen.filter((s) => s.length === 2 && s[0] === awal).map((s) => s[1]))]
  const subSlug = [...new Set(segmen.filter((s) => s.length === 2 && !['tools', 'video', 'penulis', 'glosarium'].includes(s[0])).map((s) => s[1]))]
  const cari = async (collection: 'artikel' | 'pilar' | 'halaman' | 'tools' | 'video' | 'penulis' | 'subkategori', slug: string[], field: 'judul' | 'nama') => {
    if (slug.length === 0) return new Map<string, string>()
    const { docs } = await payload.find({
      collection,
      where: { slug: { in: slug } },
      draft: false,
      depth: 0,
      limit: slug.length * 2,
      pagination: false,
      select: { slug: true, [field]: true } as never,
    })
    return new Map(docs.map((d) => [String((d as { slug?: string }).slug), String((d as Record<string, unknown>)[field] ?? '')]))
  }
  const [artikel, pilar, halaman, glosarium, tools, video, penulis, sub] = await Promise.all([
    cari('artikel', satu, 'judul'),
    cari('pilar', satu, 'nama'),
    cari('halaman', satu, 'judul'),
    cari('artikel', kedua('glosarium'), 'judul'),
    cari('tools', kedua('tools'), 'nama'),
    cari('video', kedua('video'), 'judul'),
    cari('penulis', kedua('penulis'), 'nama'),
    cari('subkategori', subSlug, 'nama'),
  ])
  for (const [i, path] of paths.entries()) {
    if (judul.has(path)) continue
    const s = segmen[i]
    let j: string | undefined
    if (s.length === 1) j = artikel.get(s[0]) ?? pilar.get(s[0]) ?? halaman.get(s[0])
    else if (s.length === 2 && s[0] === 'glosarium') j = glosarium.get(s[1])
    else if (s.length === 2 && s[0] === 'tools') j = tools.get(s[1])
    else if (s.length === 2 && s[0] === 'video') j = video.get(s[1])
    else if (s.length === 2 && s[0] === 'penulis') j = penulis.get(s[1])
    else if (s.length === 2) j = sub.get(s[1])
    else if (s.length === 3 && s[1] === 'halaman') j = pilar.get(s[0]) && `${pilar.get(s[0])}, halaman ${s[2]}`
    if (j) judul.set(path, j)
  }
  return judul
}

/** Rentang lebih dari ini digambar per bulan, supaya batang grafik tetap terbaca. */
export const MAKS_HARI_GRAFIK = 92

/**
 * Grafik: per jam (WIB) bila rentang satu hari, per hari dari total harian bila sampai `MAKS_HARI_GRAFIK` hari, dan
 * per bulan untuk rentang lebih panjang. Jam, hari, atau bulan tanpa data bernilai 0. Kunci titik: `HH`, `YYYY-MM-DD`,
 * atau `YYYY-MM`.
 */
async function seri(payload: Payload, r: Rentang): Promise<TitikSeri[]> {
  if (r.dari === r.sampai) {
    const { rows } = await db(payload).execute(sql`
      select extract(hour from waktu at time zone 'Asia/Jakarta')::int as jam, count(*) as tayangan, count(distinct sidik) as kunjungan
      from kunjungan where tanggal = ${r.dari} group by 1`)
    const perJam = new Map(rows.map((b) => [angka(b.jam), b]))
    return Array.from({ length: 24 }, (_, jam) => {
      const b = perJam.get(jam)
      const kunci = String(jam).padStart(2, '0')
      return { kunci, label: `${kunci}.00`, tayangan: angka(b?.tayangan), kunjungan: angka(b?.kunjungan) }
    })
  }
  const { rows } = await db(payload).execute(sql`
    select tanggal, tayangan, pengunjung from kunjungan_harian where tanggal >= ${r.dari} and tanggal <= ${r.sampai}`)
  const perHari = new Map(rows.map((b) => [String(b.tanggal), b]))
  const hari = daftarTanggal(r.dari, r.sampai)
  if (hari.length <= MAKS_HARI_GRAFIK) {
    return hari.map((t) => ({ kunci: t, label: t, tayangan: angka(perHari.get(t)?.tayangan), kunjungan: angka(perHari.get(t)?.pengunjung) }))
  }
  const perBulan = new Map<string, TitikSeri>()
  for (const t of hari) {
    const kunci = t.slice(0, 7)
    const titik = perBulan.get(kunci) ?? { kunci, label: kunci, tayangan: 0, kunjungan: 0 }
    titik.tayangan += angka(perHari.get(t)?.tayangan)
    titik.kunjungan += angka(perHari.get(t)?.pengunjung)
    perBulan.set(kunci, titik)
  }
  return [...perBulan.values()]
}

/**
 * Data Statistik kunjungan beranda admin (spesifikasi §26): ringkasan Hari ini, 7 hari, 30 hari (masing-masing
 * dibanding periode sebelumnya) dan Total dari `kunjungan-harian`; untuk rentang terpilih grafik, sedang online,
 * dan rincian negara, kota, kanal, sumber, perujuk, halaman, halaman masuk, perangkat, dan peramban dari baris mentah.
 * Kanal, sumber, dan perujuk dihitung dari halaman masuk (tayangan pertama sebuah kunjungan), bukan pindah halaman.
 */
export async function ambilKunjungan(payload: Payload, pilih: (dataPertama: string | null) => Rentang, sekarang = new Date()): Promise<DataKunjungan> {
  const hariIni = tanggalWib(sekarang)
  const { rows: awal } = await db(payload).execute(sql`
    select min(tanggal) as pertama, coalesce(sum(tayangan), 0) as tayangan, coalesce(sum(pengunjung), 0) as kunjungan from kunjungan_harian`)
  const dataPertama = awal[0]?.pertama ? String(awal[0].pertama) : null
  const rentang = pilih(dataPertama)
  const ringkas = await Promise.all(
    PILIHAN_RENTANG.filter((p) => p.jenis !== 'semua').map(async (p) => ({
      jenis: p.jenis,
      label: p.label,
      angka: await banding(payload, rentangPilihan(p.jenis, hariIni, dataPertama), sekarang),
    })),
  )
  const awalOnline = new Date(sekarang.getTime() - MENIT_ONLINE * 60_000).toISOString()
  const akhirOnline = sekarang.toISOString()
  const { rows: online } = await db(payload).execute(
    sql`select count(distinct sidik) as n from kunjungan where waktu > ${awalOnline} and waktu <= ${akhirOnline}`,
  )
  const { rows: dibaca } = await db(payload).execute(sql`
    select path as kunci, count(*) as tayangan, count(distinct sidik) as kunjungan from kunjungan
    where waktu > ${awalOnline} and waktu <= ${akhirOnline} group by 1 order by kunjungan desc, tayangan desc, kunci asc limit 5`)

  const masuk = sql`masuk = true`
  const [negara, kota, kanal, sumber, perujuk, halaman, halamanMasuk, perangkat, peramban] = await Promise.all([
    rincian(payload, sql`negara`, rentang),
    rincian(payload, sql`concat_ws('|', kota, negara)`, rentang, sql`kota is not null`),
    rincian(payload, sql`kanal`, rentang, masuk, 10),
    rincian(payload, sql`concat_ws('|', sumber, kanal)`, rentang, sql`masuk = true and kanal <> 'langsung'`),
    rincian(payload, sql`perujuk`, rentang, sql`masuk = true and perujuk is not null and kanal <> 'internal'`),
    rincian(payload, sql`path`, rentang),
    rincian(payload, sql`path`, rentang, masuk),
    rincian(payload, sql`perangkat`, rentang, sql`true`, 3),
    rincian(payload, sql`peramban`, rentang),
  ])
  const pathOnline = dibaca.map((b) => String(b.kunci))
  const judul = await judulHalaman(payload, [...new Set([...halaman, ...halamanMasuk].map((b) => b.kunci ?? '').concat(pathOnline))])
  const barisHalaman = (b: { kunci: string | null; tayangan: number; kunjungan: number }): BarisRincian => {
    const path = b.kunci ?? '/'
    const j = judul.get(path)
    return { kunci: path, label: j ?? path, ket: j ? path : null, ikon: null, tayangan: b.tayangan, kunjungan: b.kunjungan }
  }

  return {
    rentang,
    hariIni,
    dataPertama,
    ringkas,
    total: { tayangan: angka(awal[0]?.tayangan), kunjungan: angka(awal[0]?.kunjungan) },
    angka: await banding(payload, rentang, sekarang),
    seri: await seri(payload, rentang),
    online: {
      pengunjung: angka(online[0]?.n),
      halaman: dibaca.map((b) => barisHalaman({ kunci: String(b.kunci), tayangan: angka(b.tayangan), kunjungan: angka(b.kunjungan) })),
    },
    negara: negara.map((b) => ({ ...b, kunci: b.kunci ?? '-', label: namaNegara(b.kunci), ket: b.kunci, ikon: benderaNegara(b.kunci) || null })),
    kota: kota.map((b) => {
      const [nama, kode] = (b.kunci ?? '').split('|')
      return { ...b, kunci: b.kunci ?? '-', label: nama, ket: kode ? namaNegara(kode) : null, ikon: benderaNegara(kode ?? null) || null }
    }),
    kanal: kanal.map((b) => {
      const k = (b.kunci ?? 'langsung') as Kanal
      return { ...b, kunci: k, kanal: k, label: LABEL_KANAL[k] ?? k, ket: null, ikon: null }
    }),
    sumber: sumber.map((b) => {
      const [nama, k] = (b.kunci ?? '').split('|')
      return { ...b, kunci: b.kunci ?? '-', label: nama, ket: LABEL_KANAL[k as Kanal] ?? k ?? null, ikon: null }
    }),
    perujuk: perujuk.map((b) => ({ ...b, kunci: b.kunci ?? '-', label: b.kunci ?? '-', ket: null, ikon: null })),
    halaman: halaman.map(barisHalaman),
    masuk: halamanMasuk.map(barisHalaman),
    perangkat: perangkat.map((b) => ({ ...b, kunci: b.kunci ?? '-', label: LABEL_PERANGKAT[b.kunci as Perangkat] ?? b.kunci ?? '-', ket: null, ikon: null })),
    peramban: peramban.map((b) => ({ ...b, kunci: b.kunci ?? '-', label: b.kunci ?? '-', ket: null, ikon: null })),
    rincianTerpotong: rentang.dari < geserTanggal(hariIni, -SIMPAN_HARI),
  }
}

/** Baris CSV rentang terpilih: satu baris per hari dan kombinasi dimensi, paling banyak 100.000 baris. */
export async function barisCsvKunjungan(payload: Payload, r: Rentang): Promise<BarisCsvKunjungan[]> {
  const { rows } = await db(payload).execute(sql`
    select tanggal, path, negara, kota, kanal, sumber, perujuk, perangkat, peramban, count(*) as tayangan, count(distinct sidik) as kunjungan
    from kunjungan where tanggal >= ${r.dari} and tanggal <= ${r.sampai}
    group by tanggal, path, negara, kota, kanal, sumber, perujuk, perangkat, peramban
    order by tanggal asc, tayangan desc, path asc limit 100000`)
  return rows.map((b) => ({
    tanggal: String(b.tanggal),
    path: String(b.path),
    negara: b.negara === null ? null : String(b.negara),
    kota: b.kota === null ? null : String(b.kota),
    kanal: String(b.kanal),
    sumber: String(b.sumber),
    perujuk: b.perujuk === null ? null : String(b.perujuk),
    perangkat: String(b.perangkat),
    peramban: String(b.peramban),
    tayangan: angka(b.tayangan),
    kunjungan: angka(b.kunjungan),
  }))
}
