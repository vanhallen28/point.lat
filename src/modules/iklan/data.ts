import type { Payload } from 'payload'

import type { Iklan } from '@/payload-types'

import type { PengaturanIklan } from './tipe'

/** Dokumen global `iklan` menjadi `PengaturanIklan` (isian kosong dirapikan). */
export function susunPengaturan(doc: Partial<Iklan>): PengaturanIklan {
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
  }
}

/** Pengaturan iklan dari database (tanpa cache; halaman memakai `muatIklan`). */
export async function ambilIklan(payload: Payload): Promise<PengaturanIklan> {
  return susunPengaturan(await payload.findGlobal({ slug: 'iklan', depth: 0 }))
}
