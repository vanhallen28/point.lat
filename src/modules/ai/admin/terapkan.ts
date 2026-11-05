'use client'

import { useForm } from '@payloadcms/ui'
import { useMemo } from 'react'

/** Fungsi untuk mengembalikan isian ke nilai sebelum saran diterapkan. */
export type Batalkan = () => void

type Baris = Record<string, string>

/**
 * Menerapkan saran AI ke form artikel yang sedang dibuka, hanya saat editor menekan tombolnya. Setiap
 * fungsi mengembalikan `Batalkan` supaya penerapan bisa dibatalkan dari sidebar. Form ditandai berubah,
 * jadi autosave draf menyimpannya; tidak ada yang langsung terbit.
 *
 * Baris array diubah dengan indeks yang dihitung sendiri: `getDataByPath` baru membaca state baru setelah
 * form dirender ulang, sedangkan reducer form memproses setiap tambah dan hapus baris berurutan.
 */
export function useTerapkan() {
  const { addFieldRow, dispatchFields, getDataByPath, removeFieldRow, setModified } = useForm()
  return useMemo(() => {
    const isiTeks = (path: string, value: unknown) => {
      dispatchFields({ type: 'UPDATE', path, value })
      setModified(true)
    }
    const barisSekarang = (path: string): Baris[] => {
      const data = getDataByPath(path)
      return Array.isArray(data) ? (data as Baris[]) : []
    }
    const tambah = (path: string, baris: Baris[], mulai: number) =>
      baris.forEach((b, i) =>
        addFieldRow({
          path,
          rowIndex: mulai + i,
          schemaPath: path,
          subFieldState: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { value: v, initialValue: v, valid: true }])),
        }),
      )
    /** Menghapus `jumlah` baris mulai indeks `mulai`, dari belakang supaya indeks yang tersisa tidak bergeser. */
    const hapus = (path: string, mulai: number, jumlah: number) => {
      for (let i = mulai + jumlah - 1; i >= mulai; i--) removeFieldRow({ path, rowIndex: i })
    }

    return {
      /** Mengganti isian teks (judul SEO, meta description, slug). */
      teks(path: string, nilai: string): Batalkan {
        const lama = getDataByPath(path)
        isiTeks(path, nilai)
        return () => isiTeks(path, lama ?? '')
      },
      /** Mengganti semua baris field array (poin Intinya). */
      gantiBaris(path: string, baris: Baris[]): Batalkan {
        const kunci = Object.keys(baris[0] ?? {})
        const lama = barisSekarang(path).map((b) => Object.fromEntries(kunci.map((k) => [k, String(b[k] ?? '')])))
        hapus(path, 0, lama.length)
        tambah(path, baris, 0)
        return () => {
          hapus(path, 0, baris.length)
          tambah(path, lama, 0)
        }
      },
      /** Menambah baris di akhir field array (FAQ). */
      tambahBaris(path: string, baris: Baris[]): Batalkan {
        const awal = barisSekarang(path).length
        tambah(path, baris, awal)
        return () => hapus(path, awal, baris.length)
      },
      /** Menandai artikel memakai draf AI (checklist review wajib sebelum terbit). Tidak dibatalkan. */
      tandaiDrafAi() {
        isiTeks('pakaiDrafAi', true)
      },
    }
  }, [addFieldRow, dispatchFields, getDataByPath, removeFieldRow, setModified])
}
