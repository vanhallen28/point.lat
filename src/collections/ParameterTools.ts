import type { CollectionConfig } from 'payload'
import { array, number, text } from 'payload/shared'

import { isLoggedIn } from '@/access'
import { kabariParameterTools } from '@/hooks/kabariMesinPencari'
import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
import { LABEL_TOOL, TOOL_IDS, type ToolId } from '@/lib/konstanta'
import { TAG } from '@/lib/tag'
import { validasiRentangTanggal, validasiUrlOpsional } from '@/lib/validasi'
import { periksaParameter, type BarisTabel } from '@/modules/hitung'

type DataParameter = Partial<{ toolId: ToolId; kunci: string; nilai: number | null; tabel: BarisTabel[] | null }>

/** Pesan modul hitung untuk satu field, dari data dokumen lengkap (kunci, nilai, tabel saling bergantung). */
function pesan(field: 'kunci' | 'nilai' | 'tabel', data: DataParameter, nilaiField: unknown): string | true {
  if (!data?.toolId) return true
  const doc = { toolId: data.toolId, kunci: data.kunci ?? '', nilai: data.nilai, tabel: data.tabel, [field]: nilaiField }
  return periksaParameter(doc)[field] ?? true
}

/** Halaman tools membaca parameter lewat cache bertag `parameter-tools`, jadi perubahan langsung tampil. */
const revalidasi = revalidasiKoleksi([TAG.parameterTools])

/**
 * Angka aturan (PTKP, tarif TER, batas iuran, kategori IMT) yang bisa berubah. Dibaca modul hitung
 * sesuai tanggal berlaku. Satu angka di `nilai`, tabel (tarif berlapis, daftar pilihan) di `tabel`.
 * Kunci dan bentuknya divalidasi modul hitung supaya dokumen yang tersimpan selalu bisa dipakai.
 */
export const ParameterTools: CollectionConfig = {
  slug: 'parameter-tools',
  labels: { singular: 'Parameter tools', plural: 'Parameter tools' },
  admin: {
    useAsTitle: 'kunci',
    defaultColumns: ['toolId', 'kunci', 'nilai', 'berlakuMulai', 'berlakuSampai'],
    group: 'Tools',
    description:
      'Untuk mengganti angka yang berubah (misalnya batas upah JP tahun depan), buat dokumen baru dengan kunci yang sama dan tanggal berlaku baru, lalu isi tanggal akhir dokumen lama.',
  },
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    afterChange: [revalidasi.afterChange, kabariParameterTools.afterChange],
    afterDelete: [revalidasi.afterDelete, kabariParameterTools.afterDelete],
  },
  fields: [
    {
      name: 'toolId',
      type: 'select',
      required: true,
      options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
    },
    {
      name: 'kunci',
      type: 'text',
      required: true,
      admin: { description: 'Nama parameter di modul hitung, misalnya ptkp-dasar atau ter-a. Kunci yang tidak dikenal ditolak beserta daftar kunci yang benar.' },
      validate: (value: unknown, opsi: Parameters<typeof text>[1]) => {
        const dasar = text(value as string, opsi)
        return dasar === true ? pesan('kunci', opsi.data as DataParameter, value) : dasar
      },
    },
    {
      name: 'nilai',
      type: 'number',
      admin: { description: 'Untuk parameter satu angka. Persen ditulis seperti di peraturan: 1,5 berarti 1,5%.' },
      validate: (value: unknown, opsi: Parameters<typeof number>[1]) => {
        const dasar = number(value as number, opsi)
        return dasar === true ? pesan('nilai', opsi.data as DataParameter, value) : dasar
      },
    },
    {
      name: 'tabel',
      type: 'array',
      labels: { singular: 'Baris', plural: 'Baris' },
      admin: {
        description:
          'Untuk parameter berbentuk tabel: tarif TER, lapisan Pasal 17, kategori IMT, faktor aktivitas, kelipatan dana darurat, konversi nilai. Batas berarti "sampai dengan"; kosongkan batas baris terakhir untuk tanpa batas.',
      },
      validate: (value: unknown, opsi: Parameters<typeof array>[1]) => {
        const dasar = array(value as unknown[], opsi)
        return dasar === true ? pesan('tabel', opsi.data as DataParameter, value) : dasar
      },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'batas', type: 'number' },
        { name: 'nilai', type: 'number' },
      ],
    },
    { name: 'berlakuMulai', type: 'date', required: true },
    {
      name: 'berlakuSampai',
      type: 'date',
      admin: { description: 'Kosongkan bila masih berlaku.' },
      validate: (
        value: unknown,
        { siblingData }: { siblingData: Partial<{ berlakuMulai: string | null }> },
      ) => validasiRentangTanggal(siblingData?.berlakuMulai, value as string | null | undefined),
    },
    {
      name: 'sumber',
      type: 'group',
      fields: [
        { name: 'judul', type: 'text' },
        { name: 'url', type: 'text', validate: (value: unknown) => validasiUrlOpsional(value) },
      ],
    },
    { name: 'catatan', type: 'textarea' },
  ],
}
