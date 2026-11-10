'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Permintaan = { aksi: 'usulan' | 'tulis' | 'antre' } | { id: number; status: 'disetujui' | 'ditolak' | 'keluar' }

/** Jeda dan batas pemeriksaan: satu draf lengkap biasanya dua sampai tiga menit. */
const JEDA_TANYA_MS = 3000
const MAKS_TANYA = 100

const tunggu = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms))

/**
 * Tombol aksi kartu Otomasi artikel (spesifikasi §27): setujui atau tolak usulan, keluarkan dari antrean, minta
 * usulan, tulis satu draf, dan antre sekarang. Aksi panjang berjalan di server setelah respons (202); tombol
 * menanyakan `GET /api/usulan-topik/keadaan` sampai selesai, lalu menyegarkan beranda admin. Pola aksi admin:
 * `aria-disabled` (fokus keyboard tetap) dan umpan balik di `role="status"`.
 */
export function AksiOtomasi({ minta, label, utama = false, labelAkses }: { minta: Permintaan; label: string; utama?: boolean; labelAkses?: string }) {
  const router = useRouter()
  const [jalan, setJalan] = useState(false)
  const [pesan, setPesan] = useState('')

  async function klik() {
    if (jalan) return
    setJalan(true)
    setPesan('')
    try {
      const url = 'aksi' in minta ? '/api/usulan-topik/aksi' : `/api/usulan-topik/${minta.id}/status`
      const badan = 'aksi' in minta ? { aksi: minta.aksi } : { status: minta.status }
      const jawaban = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(badan),
      })
      const hasil = (await jawaban.json()) as { status: string; pesan: string }
      setPesan(hasil.pesan)
      if (hasil.status === 'antre') {
        for (let i = 0; i < MAKS_TANYA; i++) {
          await tunggu(JEDA_TANYA_MS)
          const keadaan = (await (await fetch('/api/usulan-topik/keadaan', { credentials: 'same-origin' })).json()) as { berjalan: string | null }
          if (!keadaan.berjalan) {
            setPesan('Selesai.')
            break
          }
        }
      }
      router.refresh()
    } catch {
      setPesan('Permintaan gagal. Periksa koneksi, lalu coba lagi.')
    } finally {
      setJalan(false)
    }
  }

  return (
    <span className="otomasi-aksi">
      <button
        type="button"
        className={utama ? 'otomasi-tombol otomasi-tombol--utama' : 'otomasi-tombol'}
        aria-disabled={jalan}
        aria-label={labelAkses}
        onClick={klik}
      >
        {jalan ? 'Memproses' : label}
      </button>
      <span role="status" className="otomasi-aksi__pesan">
        {pesan}
      </span>
    </span>
  )
}
