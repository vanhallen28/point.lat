import type { GlobalConfig, PayloadRequest } from 'payload'

import { anyone, isAdmin } from '@/access'
import { revalidasiIklan } from '@/hooks/revalidasiPublik'
import {
  PARAGRAF_IKLAN,
  validasiAdsTxt,
  validasiDaftarSlot,
  validasiIdPenerbit,
  validasiIdSlot,
  validasiTampilkanIklan,
  validasiUnit,
} from '@/modules/iklan/aturan'
import { kebijakanPrivasiTerbit } from '@/modules/iklan/data'
import { LABEL_POSISI_IKLAN, LABEL_UKURAN_IKLAN, POSISI_IKLAN, UKURAN_IKLAN } from '@/modules/iklan/tipe'

/**
 * Pengaturan iklan (spesifikasi §6 `iklan`, §11): saklar, penyedia, ID penerbit, mode uji, slot (ID,
 * posisi, ukuran, unit, aktif), dan baris `ads.txt` tambahan. Penjelasan untuk editor ditulis komponen
 * `PetunjukIklan`, bukan `admin.description` (warna deskripsi bawaan Payload gagal kontras).
 * Semua isinya publik (ID penerbit tampil di kode iklan dan `ads.txt`), jadi boleh dibaca siapa saja.
 */
export const Iklan: GlobalConfig = {
  slug: 'iklan',
  label: 'Iklan',
  admin: { group: 'Tampilan' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidasiIklan] },
  fields: [
    { name: 'petunjuk', type: 'ui', admin: { components: { Field: '@/modules/iklan/admin/PetunjukIklan#PetunjukIklan' } } },
    {
      name: 'aktif',
      type: 'checkbox',
      label: 'Tampilkan iklan',
      defaultValue: false,
      // Keputusan pemilik: banner menautkan Kebijakan Privasi, jadi saklar ditolak selama halaman itu belum terbit.
      validate: async (nilai: unknown, { req }: { req: PayloadRequest }) =>
        validasiTampilkanIklan(nilai, nilai === true && (await kebijakanPrivasiTerbit(req.payload, req))),
    },
    {
      name: 'penyedia',
      type: 'select',
      label: 'Penyedia iklan',
      required: true,
      defaultValue: 'adsense',
      options: [{ label: 'Google AdSense', value: 'adsense' }],
    },
    {
      name: 'idPenerbit',
      type: 'text',
      label: 'ID penerbit AdSense (ca-pub-...)',
      validate: (nilai: unknown, { siblingData }: { siblingData: Partial<{ aktif: boolean }> }) => validasiIdPenerbit(nilai, siblingData?.aktif),
    },
    { name: 'modeUji', type: 'checkbox', label: 'Mode uji: minta iklan uji (data-adtest), bukan tayangan sungguhan', defaultValue: false },
    {
      name: 'slot',
      type: 'array',
      label: 'Slot iklan',
      labels: { singular: 'Slot', plural: 'Slot' },
      validate: (nilai: unknown) => validasiDaftarSlot(nilai),
      fields: [
        // Bukan `id`: nama itu dipakai Payload sebagai kunci baris array.
        { name: 'idSlot', type: 'text', label: 'ID slot', required: true, validate: (nilai: unknown) => validasiIdSlot(nilai) },
        {
          name: 'posisi',
          type: 'select',
          label: 'Posisi',
          required: true,
          options: POSISI_IKLAN.map((value) => ({ value, label: LABEL_POSISI_IKLAN[value] })),
        },
        {
          name: 'setelahParagraf',
          type: 'number',
          label: 'Setelah paragraf ke',
          min: PARAGRAF_IKLAN.min,
          max: PARAGRAF_IKLAN.maks,
          defaultValue: PARAGRAF_IKLAN.bawaan,
          admin: { condition: (_, slot) => slot?.posisi === 'artikel-tengah' },
        },
        {
          name: 'ukuran',
          type: 'select',
          label: 'Ukuran',
          required: true,
          defaultValue: 'persegi',
          options: UKURAN_IKLAN.map((value) => ({ value, label: LABEL_UKURAN_IKLAN[value] })),
        },
        { name: 'unit', type: 'text', label: 'Unit iklan (angka data-ad-slot)', required: true, validate: (nilai: unknown) => validasiUnit(nilai) },
        { name: 'aktif', type: 'checkbox', label: 'Aktif', defaultValue: true },
      ],
    },
    {
      name: 'adsTxtTambahan',
      type: 'textarea',
      label: 'Baris ads.txt tambahan',
      validate: (nilai: unknown) => validasiAdsTxt(nilai),
    },
    { name: 'pratinjauAdsTxt', type: 'ui', admin: { components: { Field: '@/modules/iklan/admin/PratinjauAdsTxt#PratinjauAdsTxt' } } },
  ],
}
