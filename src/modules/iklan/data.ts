import type { Payload, PayloadRequest } from 'payload'

import type { Iklan } from '@/payload-types'

import { SLUG_KEBIJAKAN_PRIVASI } from './aturan'
import type { PengaturanIklan } from './tipe'

/** Dokumen global `iklan` menjadi `PengaturanIklan` (isian kosong dirapikan). */
export function susunPengaturan(doc: Partial<Iklan>, kebijakanTerbit = false): PengaturanIklan {
  return {
    aktif: doc.aktif === true,
    penyedia: 'adsense',
    idPenerbit: doc.idPenerbit?.trim() || null,
    modeUji: doc.modeUji === true,
    slot: (doc.slot ?? []).map((s) => ({
      id: s.idSlot.trim(),
      posisi: s.posisi,
      ukuran: s.ukuran,
      unit: s.unit.trim(),
      setelahParagraf: s.setelahParagraf ?? null,
      aktif: s.aktif !== false,
    })),
    adsTxtTambahan: doc.adsTxtTambahan ?? null,
    kebijakanTerbit,
  }
}

/**
 * Halaman Kebijakan Privasi terbit: dokumen utama (versi publik), jadi draf yang disimpan di atas versi terbit
 * tidak mengubahnya. `req` dipakai validasi global supaya membaca transaksi yang sama.
 */
export async function kebijakanPrivasiTerbit(payload: Payload, req?: PayloadRequest): Promise<boolean> {
  const { totalDocs } = await payload.count({
    collection: 'halaman',
    where: { and: [{ slug: { equals: SLUG_KEBIJAKAN_PRIVASI } }, { _status: { equals: 'published' } }] },
    req,
  })
  return totalDocs > 0
}

/** Pengaturan iklan dari database (tanpa cache; halaman memakai `muatIklan`). */
export async function ambilIklan(payload: Payload): Promise<PengaturanIklan> {
  const [doc, kebijakanTerbit] = await Promise.all([payload.findGlobal({ slug: 'iklan', depth: 0 }), kebijakanPrivasiTerbit(payload)])
  return susunPengaturan(doc, kebijakanTerbit)
}
