'use client'

import { useState, type FormEvent, type ReactNode } from 'react'

import gaya from './Pembaca.module.css'

type Keadaan = { jenis: 'diam' | 'kirim' | 'berhasil' | 'gagal'; pesan: string; galat: string[] }
type Jawaban = { status?: 'berhasil' | 'gagal'; pesan?: string; galat?: Record<string, string> }

/**
 * Form pembaca (kontak, newsletter, berhenti langganan; spesifikasi §23). Tanpa JavaScript form dikirim biasa dan
 * endpoint mengalihkan kembali ke `#fragmen` hasil (pesan tampil lewat CSS `:target`). Dengan JavaScript, form dikirim
 * sebagai JSON, hasilnya diumumkan di `role="status"`, dan kolom yang salah ditandai `aria-invalid` lalu difokus.
 * Tombol memakai `aria-disabled` saat mengirim supaya fokus keyboard tidak hilang.
 */
export function FormPembaca({ action, label, tombol, children }: { action: string; label: string; tombol: string; children: ReactNode }) {
  const [keadaan, setKeadaan] = useState<Keadaan>({ jenis: 'diam', pesan: '', galat: [] })

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (keadaan.jenis === 'kirim') return
    const form = e.currentTarget
    const data: Record<string, string> = {}
    new FormData(form).forEach((nilai, nama) => {
      if (typeof nilai === 'string') data[nama] = nilai
    })
    for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid')
    setKeadaan({ jenis: 'kirim', pesan: 'Mengirim...', galat: [] })
    try {
      const r = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
      const j = (await r.json().catch(() => ({}))) as Jawaban
      if (r.ok && j.status === 'berhasil') {
        form.reset()
        setKeadaan({ jenis: 'berhasil', pesan: j.pesan ?? 'Terkirim.', galat: [] })
        return
      }
      const galat = j.galat ?? {}
      for (const nama of Object.keys(galat)) form.querySelector(`[name="${CSS.escape(nama)}"]`)?.setAttribute('aria-invalid', 'true')
      setKeadaan({ jenis: 'gagal', pesan: j.pesan ?? 'Belum terkirim. Coba lagi.', galat: Object.values(galat) })
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    } catch {
      setKeadaan({ jenis: 'gagal', pesan: 'Koneksi terputus. Coba lagi sebentar lagi.', galat: [] })
    }
  }

  return (
    <form method="post" action={action} onSubmit={kirim} aria-label={label} className={gaya.form}>
      {children}
      <button type="submit" className={gaya.tombol} aria-disabled={keadaan.jenis === 'kirim' || undefined}>
        {tombol}
      </button>
      <div role="status" className={gaya.status} data-jenis={keadaan.jenis}>
        {keadaan.jenis !== 'diam' && <p>{keadaan.pesan}</p>}
        {keadaan.galat.length > 0 && (
          <ul>
            {keadaan.galat.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
      </div>
    </form>
  )
}
