'use client'

import { useState } from 'react'

/**
 * Menyalin teks ke papan klip, dengan pemberitahuan untuk pembaca layar. Dengan `html`, papan klip berisi
 * HTML dan teks polos, jadi subjudul dan paragraf tetap terbentuk saat ditempel di editor isi.
 */
export function TombolSalin({ teks, label, html, onSalin }: { teks: string; label: string; html?: string; onSalin?: () => void }) {
  const [pesan, setPesan] = useState('')
  async function salin() {
    try {
      if (html && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([teks], { type: 'text/plain' }) }),
        ])
      } else {
        await navigator.clipboard.writeText(teks)
      }
      onSalin?.()
      setPesan('Tersalin.')
    } catch {
      setPesan('Tidak bisa menyalin otomatis. Pilih teksnya, lalu salin manual.')
    }
  }
  return (
    <p className="asisten-saran__aksi">
      <button type="button" className="asisten__tombol asisten__tombol--kecil" onClick={salin}>
        {label}
      </button>{' '}
      <span role="status">{pesan}</span>
    </p>
  )
}
