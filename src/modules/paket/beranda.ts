import type { Payload, PayloadRequest } from 'payload'

type Id = number

type BlokBaru =
  | { blockType: 'mozaikPilihan'; judul: string; artikel: Id[]; tampilkanTools: boolean }
  | { blockType: 'stripTools'; judul: string }
  | { blockType: 'barisRubrik'; jumlah: number }

export type RencanaBeranda<B> = { jenis: 'sudah-ada' | 'dilewati' } | { jenis: 'tambah'; tataLetak: (B | BlokBaru)[]; ditambah: BlokBaru['blockType'][] }

/**
 * Rencana tata letak beranda bergaya portal (spesifikasi §25): blok yang belum ada ditambahkan tanpa mengubah
 * blok lain.
 *
 * - Mozaik "Pilihan redaksi" (berita utama) tepat setelah hero, bila ada artikel pilihan.
 * - Strip kalkulator setelah blok Paling dicari (atau setelah mozaik, atau setelah hero).
 * - Baris rubrik setelah strip kalkulator.
 *
 * Tidak ada yang diubah bila beranda punya perubahan yang belum diterbitkan (`tertunda`): menerbitkan tata letak
 * baru akan ikut menerbitkan perubahan itu.
 */
export function rencanaBeranda<B extends { blockType: string }>(tata: B[], tertunda: boolean, artikelMozaik: Id[]): RencanaBeranda<B> {
  if (tertunda) return { jenis: 'dilewati' }
  const hasil: (B | BlokBaru)[] = [...tata]
  const ditambah: BlokBaru['blockType'][] = []
  const ada = (jenis: string) => hasil.some((b) => b.blockType === jenis)
  const setelah = (...jenis: string[]) => {
    for (const j of jenis) {
      for (let i = hasil.length - 1; i >= 0; i--) if (hasil[i].blockType === j) return i + 1
    }
    return hasil.length
  }
  if (!ada('mozaikPilihan') && artikelMozaik.length > 0) {
    hasil.splice(hasil.findIndex((b) => b.blockType === 'heroBeranda') + 1, 0, {
      blockType: 'mozaikPilihan',
      judul: 'Pilihan redaksi',
      artikel: artikelMozaik,
      tampilkanTools: false,
    })
    ditambah.push('mozaikPilihan')
  }
  if (!ada('stripTools')) {
    hasil.splice(setelah('palingDibaca', 'mozaikPilihan', 'heroBeranda'), 0, { blockType: 'stripTools', judul: 'Hitung sendiri' })
    ditambah.push('stripTools')
  }
  if (!ada('barisRubrik')) {
    hasil.splice(setelah('stripTools'), 0, { blockType: 'barisRubrik', jumlah: 4 })
    ditambah.push('barisRubrik')
  }
  return ditambah.length > 0 ? { jenis: 'tambah', tataLetak: hasil, ditambah } : { jenis: 'sudah-ada' }
}

/** Beranda punya perubahan belum terbit bila tata letak versi terakhir (draf) berbeda dari versi yang tampil. */
export function adaPerubahanTertunda(utama: unknown, terakhir: unknown): boolean {
  return JSON.stringify(utama ?? []) !== JSON.stringify(terakhir ?? [])
}

/**
 * Menerapkan `rencanaBeranda` ke global `beranda` dan menerbitkannya. Dipakai impor paket konten dan migrasi
 * `beranda_portal`; `req` meneruskan transaksi migrasi.
 */
export async function pasangBerandaPortal(
  payload: Payload,
  artikelMozaik: Id[],
  req?: Partial<PayloadRequest>,
): Promise<'ditambah' | 'sudah-ada' | 'dilewati'> {
  const utama = await payload.findGlobal({ slug: 'beranda', depth: 0, draft: false, req })
  const terakhir = await payload.findGlobal({ slug: 'beranda', depth: 0, draft: true, req })
  const tata = terakhir.tataLetak ?? []
  if (tata.length === 0) return 'dilewati'
  const rencana = rencanaBeranda(tata, adaPerubahanTertunda(utama.tataLetak, terakhir.tataLetak), artikelMozaik)
  if (rencana.jenis !== 'tambah') return rencana.jenis
  await payload.updateGlobal({ slug: 'beranda', data: { tataLetak: rencana.tataLetak as never, _status: 'published' }, req })
  return 'ditambah'
}
