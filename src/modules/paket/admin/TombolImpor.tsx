'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Ikon } from '@/modules/redaksi/admin/IkonRedaksi'

type Tahap = 'siap' | 'berjalan' | 'selesai'

/** Jeda dan batas pemeriksaan: impor 12 artikel dengan sampulnya biasanya selesai dalam satu menit. */
const JEDA_TANYA_MS = 2000
const MAKS_TANYA = 90

const tunggu = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms))

/**
 * Tombol "Impor paket konten" (`POST /api/artikel/paket-awal`). Impor berjalan di server setelah respons; tombol
 * menanyakan `GET` yang sama sampai impor selesai, lalu menyegarkan beranda admin. Keadaan dibacakan pembaca
 * layar lewat `role="status"`; selama berjalan tombol `aria-disabled` supaya fokus keyboard tidak hilang.
 */
export function TombolImpor({ berjalan, ada }: { berjalan: boolean; ada: number }) {
  const router = useRouter()
  const [tahap, setTahap] = useState<Tahap>(berjalan ? 'berjalan' : 'siap')
  const [pesan, setPesan] = useState(berjalan ? 'Impor sedang berjalan.' : '')

  async function impor() {
    if (tahap !== 'siap') return
    setTahap('berjalan')
    setPesan('Mengimpor artikel, sampul, dan penjelasan kalkulator.')
    try {
      const jawaban = await fetch('/api/artikel/paket-awal', { method: 'POST', credentials: 'same-origin' })
      const hasil = (await jawaban.json()) as { status: string; pesan: string }
      if (hasil.status === 'selesai') {
        setTahap('selesai')
        setPesan('Impor selesai.')
        router.refresh()
        return
      }
      if (hasil.status !== 'antre') {
        setTahap(hasil.status === 'berjalan' ? 'berjalan' : 'siap')
        setPesan(hasil.pesan)
        return
      }
      for (let i = 0; i < MAKS_TANYA; i++) {
        await tunggu(JEDA_TANYA_MS)
        const status = (await (await fetch('/api/artikel/paket-awal', { credentials: 'same-origin' })).json()) as { berjalan: string | null; ada: number }
        if (!status.berjalan) {
          setTahap('selesai')
          setPesan(`Impor selesai. ${status.ada} artikel paket ada di situs sebagai draf atau terbit.`)
          router.refresh()
          return
        }
      }
      setPesan('Impor masih berjalan. Muat ulang halaman ini sebentar lagi.')
    } catch {
      setTahap('siap')
      setPesan('Permintaan gagal. Periksa koneksi, lalu coba lagi.')
    }
  }

  return (
    <div className="paket__tombol">
      <button type="button" className="redaksi-tombol" aria-disabled={tahap !== 'siap'} onClick={impor}>
        <Ikon nama="unduh" />
        {tahap === 'berjalan' ? 'Mengimpor' : ada > 0 ? 'Impor artikel yang belum masuk' : 'Impor paket konten'}
      </button>
      <p role="status" className="paket__pesan">
        {pesan}
      </p>
    </div>
  )
}
