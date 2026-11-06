'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { teksWaktu } from '../format'

type Batas = { boleh: true } | { boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: string }
type Keadaan = { tahap: 'siap' | 'berjalan' | 'dibatasi'; pesan: string }

/** Jeda dan jumlah pemeriksaan hasil: pindai dijalankan setelah respons (`after()`), biasanya beberapa detik. */
const JEDA_TANYA_MS = 1500
const MAKS_TANYA = 40

const tunggu = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms))

/** Pesan awal bila pindai belum boleh dijalankan lagi (sama dengan `pesanBatasPindai` di server). */
function pesanBatas(batas: Exclude<Batas, { boleh: true }>): string {
  return batas.alasan === 'berjalan'
    ? 'Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.'
    : `Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai ${teksWaktu(batas.bolehLagi)}.`
}

/**
 * Tombol "Pindai ulang sekarang" di bagian Tautan rusak dashboard SEO (Rencana 8B): `POST /api/tugas-seo/pindai`,
 * lalu menanyakan tugas pindai sampai selesai setelah permintaan ini dan menyegarkan dashboard. Keadaan dibacakan
 * lewat `role="status"`; selama berjalan dan dibatasi tombol `aria-disabled` supaya fokus keyboard tidak hilang.
 */
export function TombolPindaiUlang({ batas }: { batas: Batas }) {
  const router = useRouter()
  const [keadaan, setKeadaan] = useState<Keadaan>(batas.boleh ? { tahap: 'siap', pesan: '' } : { tahap: 'dibatasi', pesan: pesanBatas(batas) })

  async function pindai() {
    if (keadaan.tahap !== 'siap') return
    setKeadaan({ tahap: 'berjalan', pesan: 'Memindai tautan di semua konten terbit.' })
    try {
      const jawaban = await fetch('/api/tugas-seo/pindai', { method: 'POST', credentials: 'same-origin' })
      const hasil = (await jawaban.json()) as { status: string; pesan: string; diminta?: string }
      if (hasil.status !== 'antre' || !hasil.diminta) {
        setKeadaan({ tahap: hasil.status === 'dibatasi' ? 'dibatasi' : 'siap', pesan: hasil.pesan })
        return
      }
      for (let i = 0; i < MAKS_TANYA; i++) {
        await tunggu(JEDA_TANYA_MS)
        const { docs } = (await (await fetch('/api/tugas-seo?where[jenis][equals]=tautan&depth=0&limit=1', { credentials: 'same-origin' })).json()) as {
          docs: { status?: string | null; pesan?: string | null; selesai?: string | null }[]
        }
        const tugas = docs[0]
        if (tugas?.selesai && tugas.status !== 'berjalan' && tugas.selesai >= hasil.diminta) {
          setKeadaan({ tahap: 'dibatasi', pesan: `Pindai selesai. ${tugas.pesan ?? ''}`.trim() })
          router.refresh()
          return
        }
      }
      setKeadaan({ tahap: 'dibatasi', pesan: 'Pindai tautan masih berjalan. Muat ulang halaman ini sebentar lagi untuk melihat hasilnya.' })
    } catch {
      setKeadaan({ tahap: 'siap', pesan: 'Permintaan gagal. Periksa koneksi, lalu coba lagi.' })
    }
  }

  return (
    <div className="pantau-aksi">
      <button type="button" className="pantau-aksi__tombol" aria-disabled={keadaan.tahap !== 'siap'} onClick={pindai}>
        {keadaan.tahap === 'berjalan' ? 'Memindai' : 'Pindai ulang sekarang'}
      </button>
      <p role="status" className="pantau-aksi__pesan">
        {keadaan.pesan}
      </p>
    </div>
  )
}
