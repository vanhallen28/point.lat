'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { teksWaktu } from '@/modules/pantau/format'

import { LABEL_STATUS_INDEKS, type StatusIndeks } from '../tipe'

import './indexing.scss'

type Keadaan = { tahap: 'siap' | 'berjalan' | 'dibatasi'; pesan: string }

/** Jeda dan jumlah pemeriksaan hasil: cek dijalankan setelah respons (`after()`), biasanya selesai dalam beberapa detik. */
const JEDA_TANYA_MS = 1000
const MAKS_TANYA = 20

const tunggu = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms))

/**
 * Tombol "Cek sekarang" satu status indeks (Rencana 8B): `POST /api/status-indeks/{id}/cek`, lalu menanyakan
 * hasilnya sampai cek terakhir lebih baru dari permintaan ini dan menyegarkan daftar. Keadaan (sedang dicek,
 * selesai, dibatasi, galat) dibacakan pembaca layar lewat `role="status"`. Selama berjalan tombol
 * `aria-disabled` supaya fokus keyboard tidak hilang.
 */
export function TombolCekSekarang({ id, path, bolehLagi }: { id: number; path: string; bolehLagi: string | null }) {
  const router = useRouter()
  const [keadaan, setKeadaan] = useState<Keadaan>(
    bolehLagi ? { tahap: 'dibatasi', pesan: `Baru saja diminta dicek. Bisa dicek lagi mulai ${teksWaktu(bolehLagi)}.` } : { tahap: 'siap', pesan: '' },
  )

  async function cek() {
    if (keadaan.tahap !== 'siap') return
    setKeadaan({ tahap: 'berjalan', pesan: 'Sedang dicek di Google.' })
    try {
      const jawaban = await fetch(`/api/status-indeks/${id}/cek`, { method: 'POST', credentials: 'same-origin' })
      const hasil = (await jawaban.json()) as { status: string; pesan: string; dimintaPada?: string }
      if (hasil.status !== 'antre' || !hasil.dimintaPada) {
        setKeadaan({ tahap: hasil.status === 'dibatasi' ? 'dibatasi' : 'siap', pesan: hasil.pesan })
        return
      }
      for (let i = 0; i < MAKS_TANYA; i++) {
        await tunggu(JEDA_TANYA_MS)
        const doc = (await (await fetch(`/api/status-indeks/${id}?depth=0`, { credentials: 'same-origin' })).json()) as {
          status?: StatusIndeks
          cekTerakhir?: string | null
        }
        if (doc.cekTerakhir && doc.status && doc.cekTerakhir >= hasil.dimintaPada) {
          setKeadaan({ tahap: 'dibatasi', pesan: `Selesai dicek: ${LABEL_STATUS_INDEKS[doc.status]}.` })
          router.refresh()
          return
        }
      }
      setKeadaan({ tahap: 'dibatasi', pesan: 'Cek masih menunggu giliran. Muat ulang daftar ini sebentar lagi untuk melihat hasilnya.' })
    } catch {
      setKeadaan({ tahap: 'siap', pesan: 'Permintaan gagal. Periksa koneksi, lalu coba lagi.' })
    }
  }

  return (
    <div className="indexing-cek">
      <button
        type="button"
        className="indexing-cek__tombol"
        aria-disabled={keadaan.tahap !== 'siap'}
        onClick={cek}
      >
        {keadaan.tahap === 'berjalan' ? 'Mengecek' : 'Cek sekarang'}
        <span className="indexing-cek__sr"> {path}</span>
      </button>
      <p role="status" className="indexing-cek__pesan">
        {keadaan.pesan}
      </p>
    </div>
  )
}
