'use client'

import { useState, useSyncExternalStore } from 'react'

const tanpaLangganan = () => () => {}

/**
 * Tombol Salin tautan (JavaScript kecil). Baru tampil setelah JavaScript berjalan, karena tanpa JavaScript tombol
 * ini tidak bisa berbuat apa-apa; hasilnya diumumkan di `role="status"`.
 */
export function SalinTautan({ url, kelas }: { url: string; kelas: string }) {
  // `false` di server dan saat hidrasi, lalu sesuai kemampuan browser: tanpa efek dan tanpa render berantai.
  const siap = useSyncExternalStore(tanpaLangganan, () => Boolean(navigator.clipboard), () => false)
  const [pesan, setPesan] = useState('')
  if (!siap) return null
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setPesan('Tautan disalin.')
    } catch {
      setPesan('Tautan belum tersalin. Salin dari bilah alamat.')
    }
  }
  return (
    <>
      <button type="button" className={kelas} onClick={salin}>
        Salin tautan
      </button>
      <span role="status" className="sr">
        {pesan}
      </span>
    </>
  )
}
