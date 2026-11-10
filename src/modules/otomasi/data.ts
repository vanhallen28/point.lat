import { sql } from '@payloadcms/db-postgres'
import type { Payload, Where } from 'payload'

import { LABEL_TOOL, TOOL_IDS, type WarnaPilar } from '@/lib/konstanta'
import { pathFor } from '@/lib/paths'
import { jalankan } from '@/modules/ai/jalankan'
import type { HasilArtikel, MasukanArtikel } from '@/modules/ai/prompt/artikel'
import type { HasilUsulan, MasukanUsulan } from '@/modules/ai/prompt/usulan'
import { imporPaket } from '@/modules/paket/impor'
import type { ArtikelPaket } from '@/modules/paket/tipe'
import { analisis, skor } from '@/modules/seo/analisis'
import { sarankanLink, type ArtikelLain } from '@/modules/seo/kemiripan'
import { ambilSitus } from '@/modules/seo/situs'

import {
  alasanBelumSiap,
  awalHariWib,
  rapikanSlot,
  sisaCekAngka,
  slotBerikutnya,
  tanggalWib,
  DRAF_PER_HARI,
  SLOT_BAWAAN,
  type DrafAntre,
} from './aturan'
import { gambarSampul } from './sampul'
import { MAKS_PERCOBAAN, type PengaturanOtomasi, type StatusUsulan } from './tipe'

type Id = number
const id = (v: unknown): Id | null => (typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number((v as { id: unknown }).id) : null)

/** Pengaturan dari global `otomasi-artikel`, dengan nilai bawaan untuk kolom kosong. */
export async function ambilPengaturanOtomasi(payload: Payload): Promise<PengaturanOtomasi> {
  const g = (await payload.findGlobal({ slug: 'otomasi-artikel', depth: 0, overrideAccess: true })) as Partial<{
    aktif: boolean | null
    drafPerHari: number | null
    jumlahUsulan: number | null
    pilar: unknown[] | null
    penulis: unknown
    arahan: string | null
    slotTerbit: { hari?: unknown; jam?: unknown } | null
    antreOtomatis: boolean | null
  }>
  const slot = g.slotTerbit ? rapikanSlot(g.slotTerbit.hari, g.slotTerbit.jam) : SLOT_BAWAAN
  return {
    aktif: g.aktif === true,
    drafPerHari: typeof g.drafPerHari === 'number' ? g.drafPerHari : DRAF_PER_HARI.bawaan,
    jumlahUsulan: typeof g.jumlahUsulan === 'number' ? g.jumlahUsulan : 8,
    pilar: (g.pilar ?? []).map(id).filter((x): x is Id => x !== null),
    penulis: id(g.penulis),
    arahan: g.arahan?.trim() ?? '',
    slot,
    antreOtomatis: g.antreOtomatis !== false,
  }
}

// Penanda waktu di payload_kv ------------------------------------------------------------------------------

export const KUNCI_TERAKHIR = 'otomasi:terakhir'

export type Terakhir = { usulan?: string; tulis?: string; pesan?: string; pesanPada?: string }

export async function bacaTerakhir(payload: Payload): Promise<Terakhir> {
  const { rows } = await payload.db.drizzle.execute(sql`select data from payload_kv where key = ${KUNCI_TERAKHIR}`)
  return (rows[0]?.data as Terakhir | undefined) ?? {}
}

async function catatTerakhir(payload: Payload, ubah: Terakhir): Promise<void> {
  const data = JSON.stringify(ubah)
  await payload.db.drizzle.execute(
    sql`insert into payload_kv (key, data) values (${KUNCI_TERAKHIR}, ${data}::jsonb)
        on conflict (key) do update set data = payload_kv.data || excluded.data`,
  )
}

// Bahan untuk Claude ----------------------------------------------------------------------------------------

type PilarDok = { id: Id; slug: string; nama: string; warna: WarnaPilar | null }

async function daftarPilar(payload: Payload, pengaturan: PengaturanOtomasi): Promise<PilarDok[]> {
  const where: Where = pengaturan.pilar.length ? { id: { in: pengaturan.pilar } } : {}
  const { docs } = await payload.find({ collection: 'pilar', where, depth: 0, limit: 20, pagination: false, sort: 'urutan', overrideAccess: true })
  return docs.map((p) => ({ id: p.id, slug: p.slug as string, nama: p.nama as string, warna: (p.warna as WarnaPilar | null) ?? null }))
}

const daftarTools = () => TOOL_IDS.map((t) => ({ id: t, nama: LABEL_TOOL[t] }))

/** Usulan topik dari Claude disimpan berstatus `usulan` (menunggu pemilik). */
export async function mintaUsulan(payload: Payload, opsi: { sekarang?: Date } = {}): Promise<{ dibuat: number; pesan: string | null }> {
  const sekarang = opsi.sekarang ?? new Date()
  const pengaturan = await ambilPengaturanOtomasi(payload)
  const pilar = await daftarPilar(payload, pengaturan)
  const [sub, artikel, usulanAda, populer] = await Promise.all([
    payload.find({ collection: 'subkategori', where: { pilar: { in: pilar.map((p) => p.id) } }, depth: 0, limit: 200, pagination: false, overrideAccess: true }),
    payload.find({
      collection: 'artikel',
      draft: true,
      depth: 0,
      limit: 300,
      pagination: false,
      sort: '-updatedAt',
      select: { judul: true, slug: true, seo: { keyphrase: true } },
      overrideAccess: true,
    }),
    payload.find({ collection: 'usulan-topik', depth: 0, limit: 150, pagination: false, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'analitik-halaman', depth: 0, limit: 10, sort: '-klik7', where: { klik7: { greater_than: 0 } }, overrideAccess: true }),
  ])
  const judulPath = new Map(artikel.docs.map((a) => [`/${a.slug}`, a.judul as string]))
  const masukan: MasukanUsulan = {
    tanggal: tanggalWib(sekarang),
    jumlah: pengaturan.jumlahUsulan,
    pilar: pilar.map((p) => ({
      slug: p.slug,
      nama: p.nama,
      subkategori: sub.docs.filter((s) => id(s.pilar) === p.id).map((s) => ({ slug: s.slug as string, nama: s.nama as string })),
    })),
    artikelAda: artikel.docs.map((a) => ({ judul: (a.judul as string) || 'Tanpa judul', keyphrase: a.seo?.keyphrase ?? '' })),
    usulanAda: usulanAda.docs.map((u) => ({ judul: u.judul as string, kataKunci: u.kataKunci as string, status: u.status as string })),
    populer: populer.docs.map((p) => ({ judul: judulPath.get(p.path as string) ?? (p.path as string), klik: Number(p.klik7) })),
    tools: daftarTools(),
    arahan: pengaturan.arahan,
  }
  const r = await jalankan(payload, 'usulan', masukan, { pengguna: null, sekarang })
  await catatTerakhir(payload, { usulan: sekarang.toISOString() })
  if (r.status === 'gagal') {
    const pesan = r.rinci ? `${r.rinci[0].toUpperCase()}${r.rinci.slice(1)}.` : r.pesan
    await catatTerakhir(payload, { pesan: `Usulan topik: ${pesan}`, pesanPada: sekarang.toISOString() })
    return { dibuat: 0, pesan }
  }
  const hasil = r.hasil as HasilUsulan
  const idPilar = new Map(pilar.map((p) => [p.slug, p.id]))
  const idSub = new Map(sub.docs.map((s) => [`${id(s.pilar)}/${s.slug}`, s.id]))
  let dibuat = 0
  for (const u of hasil.usulan) {
    const p = idPilar.get(u.pilar)
    if (!p) continue
    await payload.create({
      collection: 'usulan-topik',
      overrideAccess: true,
      data: {
        judul: u.judul,
        kataKunci: u.kataKunci,
        pilar: p,
        subkategori: u.subkategori ? (idSub.get(`${p}/${u.subkategori}`) ?? null) : null,
        subkategoriBaru: u.subkategoriBaru ?? { nama: null, slug: null, deskripsi: null },
        tipe: u.tipe,
        alasan: u.alasan,
        tools: u.tools,
        status: 'usulan',
        sumber: 'ai',
      },
    })
    dibuat++
  }
  return { dibuat, pesan: null }
}

/** Tulisan terbit sebagai kandidat tautan internal draf otomatis. */
async function tulisanTerbit(payload: Payload): Promise<(ArtikelLain & { slug: string })[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { _status: { equals: 'published' } },
    depth: 0,
    limit: 300,
    pagination: false,
    sort: '-terbitPada',
    select: { judul: true, slug: true, tipe: true, pilar: true, seo: { keyphrase: true, keyphraseSekunder: true } },
    overrideAccess: true,
  })
  return docs
    .filter((d) => d.slug && d.tipe !== 'glosarium')
    .map((d) => ({
      id: d.id,
      slug: d.slug as string,
      judul: (d.judul as string) || 'Tanpa judul',
      path: pathFor({ jenis: 'artikel', slug: d.slug as string, tipe: d.tipe ?? 'panduan' }),
      pilarId: id(d.pilar),
      keyphrase: d.seo?.keyphrase,
      keyphraseSekunder: d.seo?.keyphraseSekunder,
    }))
}

/** Slug yang belum dipakai artikel lain (termasuk draf): `slug`, lalu `slug-2`, `slug-3`, dan seterusnya. */
async function slugBebas(payload: Payload, slug: string): Promise<string> {
  const { docs } = await payload.find({
    collection: 'artikel',
    draft: true,
    where: { slug: { like: slug } },
    depth: 0,
    limit: 100,
    pagination: false,
    select: { slug: true },
    overrideAccess: true,
  })
  const ada = new Set(docs.map((d) => d.slug))
  if (!ada.has(slug)) return slug
  for (let i = 2; ; i++) if (!ada.has(`${slug}-${i}`)) return `${slug}-${i}`
}

export type HasilTulis = { status: 'berhasil'; slug: string; artikel: Id } | { status: 'kosong' } | { status: 'gagal'; pesan: string }

/**
 * Menulis satu draf dari usulan `disetujui` tertua (atau `usulanId`): bahan dari database, satu panggilan Claude
 * (`artikel`), kartu sampul, lalu `imporPaket` (draf `pakaiDrafAi`, tautan internal, kalkulator tersemat,
 * subkategori baru bila perlu). Gagal tiga kali berarti usulan `gagal`.
 */
export async function tulisDraf(payload: Payload, opsi: { sekarang?: Date; usulanId?: Id } = {}): Promise<HasilTulis> {
  const sekarang = opsi.sekarang ?? new Date()
  const pengaturan = await ambilPengaturanOtomasi(payload)
  const where: Where = opsi.usulanId
    ? { id: { equals: opsi.usulanId } }
    : { and: [{ status: { equals: 'disetujui' } }, ...(pengaturan.pilar.length ? [{ pilar: { in: pengaturan.pilar } }] : [])] }
  const { docs } = await payload.find({ collection: 'usulan-topik', where, depth: 1, limit: 1, sort: 'createdAt', overrideAccess: true })
  const u = docs[0]
  if (!u || (opsi.usulanId && u.status !== 'disetujui')) return { status: 'kosong' }
  const pilar = u.pilar && typeof u.pilar === 'object' ? (u.pilar as unknown as PilarDok) : null
  if (!pilar) return { status: 'gagal', pesan: 'Pilar usulan sudah tidak ada.' }
  const sub = u.subkategori && typeof u.subkategori === 'object' ? (u.subkategori as { slug: string; nama: string; deskripsi?: string | null }) : null
  const baru = u.subkategoriBaru?.nama && u.subkategoriBaru.slug ? u.subkategoriBaru : null

  await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'menulis' }, overrideAccess: true })
  /**
   * `hitung: false` untuk keadaan di luar topik ini (Asisten AI mati, kunci belum dipasang, harga atau anggaran
   * habis): topik kembali disetujui tanpa menambah percobaan, jadi tidak gagal hanya karena anggaran habis.
   */
  const gagal = async (pesan: string, hitung = true): Promise<HasilTulis> => {
    const percobaan = (u.percobaan ?? 0) + (hitung ? 1 : 0)
    const status: StatusUsulan = percobaan >= MAKS_PERCOBAAN ? 'gagal' : 'disetujui'
    await payload.update({ collection: 'usulan-topik', id: u.id, data: { status, percobaan, pesan }, overrideAccess: true })
    await catatTerakhir(payload, { pesan: `Draf "${u.judul}": ${pesan}`, pesanPada: sekarang.toISOString() })
    return { status: 'gagal', pesan }
  }

  try {
    const [terbit, asisten] = await Promise.all([tulisanTerbit(payload), payload.findGlobal({ slug: 'asisten-ai', depth: 0, overrideAccess: true })])
    const saran = sarankanLink({ pilarId: pilar.id, keyphrase: u.kataKunci }, terbit, { jumlah: 8 })
    const linkInternal = (saran.length ? saran : terbit.filter((t) => t.pilarId === pilar.id).slice(0, 8)).map((t) => {
      const lengkap = terbit.find((x) => x.id === t.id)
      return { slug: lengkap?.slug ?? t.path.replace(/^\//, ''), judul: t.judul }
    })
    const masukan: MasukanArtikel = {
      tanggal: tanggalWib(sekarang),
      topik: {
        judul: u.judul,
        kataKunci: u.kataKunci,
        tipe: (u.tipe as MasukanArtikel['topik']['tipe']) ?? 'panduan',
        alasan: u.alasan ?? '',
        pilar: { slug: pilar.slug, nama: pilar.nama },
        subkategori: sub ? { slug: sub.slug, nama: sub.nama } : baru ? { slug: baru.slug as string, nama: baru.nama as string } : null,
      },
      linkInternal,
      tools: daftarTools(),
      toolsUtama: (u.tools ?? []) as MasukanArtikel['toolsUtama'],
      sumberResmi: (asisten.sumberResmi ?? []).filter((s) => id(s.pilar) === pilar.id).map((s) => ({ nama: s.nama, url: s.url })),
      arahan: pengaturan.arahan,
    }
    const r = await jalankan(payload, 'artikel', masukan, { pengguna: null, sekarang })
    if (r.status === 'gagal') return await gagal(r.rinci ? `Jawaban Claude tidak bisa dipakai: ${r.rinci}.` : r.pesan, r.alasan === 'claude' || r.alasan === 'masukan')
    const h = r.hasil as HasilArtikel
    const slug = await slugBebas(payload, h.slug)
    const paket: ArtikelPaket = {
      slug,
      judul: h.judul,
      tipe: masukan.topik.tipe,
      pilar: pilar.slug,
      subkategori: sub
        ? { slug: sub.slug, nama: sub.nama, deskripsi: sub.deskripsi ?? sub.nama }
        : baru
          ? { slug: baru.slug as string, nama: baru.nama as string, deskripsi: baru.deskripsi || (baru.nama as string) }
          : null,
      deck: h.deck,
      intinya: h.intinya,
      isi: h.isi,
      faq: h.faq,
      sumber: h.sumber,
      seo: h.seo,
      tools: h.tools,
      terkait: h.terkait,
      sampul: { file: `${slug}.png`, kata: h.sampul.kata, alt: h.sampul.alt },
    }
    const impor = await imporPaket(payload, {
      bacaSampul: () => gambarSampul({ kata: h.sampul.kata, label: pilar.nama, warna: pilar.warna }),
      paket: [paket],
      mozaik: [],
      perbaruiTools: false,
      penulis: pengaturan.penulis,
      sekarang,
    })
    if (!impor.artikel.dibuat.includes(slug)) return await gagal(impor.galat.join(' ') || 'Draf tidak terbuat.')

    const doc = (await payload.find({ collection: 'artikel', draft: true, where: { slug: { equals: slug } }, depth: 1, limit: 1, overrideAccess: true })).docs[0]
    const situs = await ambilSitus(payload)
    const nilai = doc ? skor(analisis(doc as never, { urlSitus: situs.urlSitus })) : null
    const catatan = [
      ...h.perluDicek.map((p) => `- ${p}`),
      ...(impor.galat.length ? ['', ...impor.galat] : []),
      ...(h.catatan.length ? ['', ...h.catatan] : []),
    ].join('\n')
    await payload.update({
      collection: 'usulan-topik',
      id: u.id,
      overrideAccess: true,
      data: {
        status: 'ditulis',
        artikel: doc?.id ?? null,
        waktuDitulis: sekarang.toISOString(),
        cekAngka: h.cekAngka,
        skorSeo: nilai ? `${nilai.hijau}/${nilai.total}` : null,
        catatan: catatan || null,
        pesan: null,
      },
    })
    await catatTerakhir(payload, { tulis: sekarang.toISOString() })
    return { status: 'berhasil', slug, artikel: doc?.id ?? 0 }
  } catch (galat) {
    payload.logger.error({ err: galat, msg: `Otomasi: draf "${u.judul}" gagal ditulis.` })
    return await gagal((galat as Error).message)
  }
}

/** Jumlah draf otomatis yang ditulis sejak 00.00 WIB hari ini. */
export async function drafHariIni(payload: Payload, sekarang = new Date()): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'usulan-topik',
    where: { waktuDitulis: { greater_than_equal: awalHariWib(sekarang).toISOString() } },
    overrideAccess: true,
  })
  return totalDocs
}

// Antrean terbit --------------------------------------------------------------------------------------------

type JobTerbit = { id: Id; waitUntil: string | null; artikel: Id | null }

/** Job `schedulePublish` Payload yang belum selesai untuk artikel: slot yang sudah terpakai dan artikel yang sudah terjadwal. */
async function jobTerbit(payload: Payload): Promise<JobTerbit[]> {
  const { docs } = await payload.find({
    collection: 'payload-jobs',
    where: { and: [{ taskSlug: { equals: 'schedulePublish' } }, { completedAt: { exists: false } }, { hasError: { not_equals: true } }] },
    depth: 0,
    limit: 500,
    pagination: false,
    overrideAccess: true,
  })
  return docs.map((j) => {
    const input = (j.input ?? {}) as { type?: string; doc?: { relationTo?: string; value?: unknown } }
    const artikel = input.type !== 'unpublish' && input.doc?.relationTo === 'artikel' ? Number(input.doc.value) : null
    return { id: j.id as Id, waitUntil: (j.waitUntil as string | null) ?? null, artikel }
  })
}

export type HasilAntre = { diantre: { judul: string; waktu: string }[]; terbit: number; kembali: number; belumSiap: number }

/**
 * Draf otomatis yang sudah direview masuk slot terbit kosong berikutnya (job `schedulePublish` Payload, jadi ikut
 * tampil di kalender dan hitungan Terjadwal beranda admin). Usulan yang artikelnya sudah terbit menjadi `terbit`;
 * yang job-nya hilang atau gagal (misalnya review dibatalkan) kembali `ditulis`.
 */
export async function antrekanTerbit(payload: Payload, opsi: { sekarang?: Date; paksa?: boolean } = {}): Promise<HasilAntre> {
  const sekarang = opsi.sekarang ?? new Date()
  const hasil: HasilAntre = { diantre: [], terbit: 0, kembali: 0, belumSiap: 0 }
  const pengaturan = await ambilPengaturanOtomasi(payload)
  // Tombol admin (`paksa`) selalu boleh mengantre; cron hanya bila otomasi dan antre otomatis menyala.
  const bolehAntre = opsi.paksa === true || (pengaturan.aktif && pengaturan.antreOtomatis)
  const { docs: usulan } = await payload.find({
    collection: 'usulan-topik',
    where: { status: { in: ['ditulis', 'terjadwal'] } },
    depth: 0,
    limit: 100,
    pagination: false,
    sort: 'waktuDitulis',
    overrideAccess: true,
  })
  if (usulan.length === 0) return hasil
  const jobs = await jobTerbit(payload)
  const terpakai = jobs.map((j) => j.waitUntil).filter((w): w is string => Boolean(w))
  for (const u of usulan) {
    const idArtikel = id(u.artikel)
    const artikel = idArtikel
      ? (await payload.find({ collection: 'artikel', draft: true, where: { id: { equals: idArtikel } }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
      : undefined
    if (!artikel) {
      await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'disetujui', artikel: null, pesan: 'Draf artikelnya sudah dihapus; topik ditulis ulang.' }, overrideAccess: true })
      continue
    }
    if (artikel._status === 'published') {
      await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'terbit' }, overrideAccess: true })
      hasil.terbit++
      continue
    }
    const job = jobs.find((j) => j.artikel === artikel.id)
    if (u.status === 'terjadwal') {
      if (!job) {
        await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'ditulis', jadwal: null }, overrideAccess: true })
        hasil.kembali++
      }
      continue
    }
    if (job) {
      await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'terjadwal', jadwal: job.waitUntil }, overrideAccess: true })
      continue
    }
    if (!bolehAntre) continue
    const alasan = alasanBelumSiap(artikel as DrafAntre)
    if (alasan.length) {
      hasil.belumSiap++
      continue
    }
    const [slot] = slotBerikutnya(pengaturan.slot, terpakai, sekarang)
    if (!slot) break
    await payload.jobs.queue({
      task: 'schedulePublish',
      input: { type: 'publish', doc: { relationTo: 'artikel', value: artikel.id } },
      waitUntil: slot,
    })
    terpakai.push(slot.toISOString())
    await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'terjadwal', jadwal: slot.toISOString(), pesan: null }, overrideAccess: true })
    hasil.diantre.push({ judul: artikel.judul as string, waktu: slot.toISOString() })
  }
  return hasil
}

/** Mengeluarkan draf dari antrean terbit: job `schedulePublish` yang belum jalan dihapus, usulan kembali `ditulis`. */
export async function keluarkanDariAntrean(payload: Payload, idUsulan: Id): Promise<boolean> {
  const u = await payload.findByID({ collection: 'usulan-topik', id: idUsulan, depth: 0, overrideAccess: true, disableErrors: true })
  const idArtikel = id(u?.artikel)
  if (!u || !idArtikel) return false
  for (const j of await jobTerbit(payload)) if (j.artikel === idArtikel) await payload.delete({ collection: 'payload-jobs', id: j.id, overrideAccess: true })
  await payload.update({ collection: 'usulan-topik', id: u.id, data: { status: 'ditulis', jadwal: null }, overrideAccess: true })
  return true
}

// Ringkasan untuk beranda admin ----------------------------------------------------------------------------

export type ItemUsulan = { id: Id; judul: string; kataKunci: string; pilar: string; alasan: string }
export type ItemDraf = { id: Id; usulan: Id; judul: string; cekAngka: number; skorSeo: string | null; alasan: string[] }
export type ItemAntrean = { id: Id; usulan: Id; judul: string; waktu: string }

export type DataOtomasi = {
  pengaturan: PengaturanOtomasi
  menunggu: { jumlah: number; daftar: ItemUsulan[] }
  disetujui: number
  draf: ItemDraf[]
  antrean: ItemAntrean[]
  drafHariIni: number
  terakhir: Terakhir
}

export async function ambilOtomasi(payload: Payload, sekarang = new Date()): Promise<DataOtomasi> {
  const pengaturan = await ambilPengaturanOtomasi(payload)
  const [menunggu, disetujui, ditulis, terjadwal, hariIni, terakhir] = await Promise.all([
    payload.find({ collection: 'usulan-topik', where: { status: { equals: 'usulan' } }, depth: 1, limit: 6, sort: '-createdAt', overrideAccess: true }),
    payload.count({ collection: 'usulan-topik', where: { status: { equals: 'disetujui' } }, overrideAccess: true }),
    payload.find({ collection: 'usulan-topik', where: { status: { equals: 'ditulis' } }, depth: 0, limit: 8, sort: 'waktuDitulis', overrideAccess: true }),
    payload.find({ collection: 'usulan-topik', where: { status: { equals: 'terjadwal' } }, depth: 0, limit: 8, sort: 'jadwal', overrideAccess: true }),
    drafHariIni(payload, sekarang),
    bacaTerakhir(payload),
  ])
  const idDraf = [...ditulis.docs, ...terjadwal.docs].map((u) => id(u.artikel)).filter((x): x is Id => x !== null)
  const artikel = idDraf.length
    ? (await payload.find({ collection: 'artikel', draft: true, where: { id: { in: idDraf } }, depth: 0, limit: idDraf.length, pagination: false, overrideAccess: true })).docs
    : []
  const cari = (x: unknown) => artikel.find((a) => a.id === id(x))
  return {
    pengaturan,
    menunggu: {
      jumlah: menunggu.totalDocs,
      daftar: menunggu.docs.map((u) => ({
        id: u.id,
        judul: u.judul,
        kataKunci: u.kataKunci,
        pilar: u.pilar && typeof u.pilar === 'object' ? (u.pilar.nama as string) : '',
        alasan: u.alasan ?? '',
      })),
    },
    disetujui: disetujui.totalDocs,
    draf: ditulis.docs.flatMap((u) => {
      const a = cari(u.artikel)
      if (!a) return []
      return [{ id: a.id, usulan: u.id, judul: a.judul as string, cekAngka: sisaCekAngka(a as DrafAntre), skorSeo: u.skorSeo ?? null, alasan: alasanBelumSiap(a as DrafAntre) }]
    }),
    antrean: terjadwal.docs.flatMap((u) => {
      const a = cari(u.artikel)
      return a && u.jadwal ? [{ id: a.id, usulan: u.id, judul: a.judul as string, waktu: u.jadwal as string }] : []
    }),
    drafHariIni: hariIni,
    terakhir,
  }
}
