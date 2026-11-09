'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { Tautan } from '@/components/dasar/Tautan'
import { simpanPilihan } from '@/modules/iklan/peramban'
import { ATRIBUT_BUKA, ATRIBUT_PANEL, ATRIBUT_PERSETUJUAN, teksPersetujuan, type PilihanPersetujuan } from '@/modules/iklan/persetujuan'

import gaya from './Persetujuan.module.css'

const LABEL: Record<PilihanPersetujuan, string> = { perlu: 'Hanya yang perlu', semua: 'Izinkan semua' }

/**
 * Banner persetujuan cookie (spesifikasi §11 dan §23, UU PDP No. 27/2022) di atas header, dalam alur halaman
 * (tidak menutupi isi). Tampil atau tersembunyi lewat CSS dari atribut `<html>` yang ditulis skrip awal,
 * jadi markup sama untuk semua pengunjung (halaman tetap ISR) dan tidak ada pergeseran tata letak saat
 * halaman dimuat. Dua pilihan setara; tombol "Pengaturan cookie" di footer membukanya lagi, dengan fokus
 * pindah ke banner dan kembali ke tombol itu setelah memilih atau menekan Escape.
 */
export function PanelPersetujuan({ kebijakan, iklan = true, layanan = [] }: { kebijakan: string; iklan?: boolean; layanan?: string[] }) {
  const teks = teksPersetujuan({ iklan, layanan })
  const panel = useRef<HTMLElement>(null)
  const pembuka = useRef<HTMLElement | null>(null)
  const [sekarang, setSekarang] = useState<PilihanPersetujuan | null>(null)

  useEffect(() => {
    const buka = (e: MouseEvent) => {
      const tombol = e.target instanceof Element ? e.target.closest<HTMLElement>(`[${ATRIBUT_BUKA}]`) : null
      if (!tombol) return
      pembuka.current = tombol
      const keadaan = document.documentElement.getAttribute(ATRIBUT_PERSETUJUAN)
      setSekarang(keadaan === 'perlu' || keadaan === 'semua' ? keadaan : null)
      document.documentElement.setAttribute(ATRIBUT_PANEL, '')
      panel.current?.focus()
    }
    document.addEventListener('click', buka)
    return () => document.removeEventListener('click', buka)
  }, [])

  const kembali = () => {
    setSekarang(null)
    pembuka.current?.focus()
    pembuka.current = null
  }

  const pilih = (pilihan: PilihanPersetujuan) => {
    simpanPilihan(pilihan)
    kembali()
  }

  const tutup = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !document.documentElement.hasAttribute(ATRIBUT_PANEL)) return
    document.documentElement.removeAttribute(ATRIBUT_PANEL)
    kembali()
  }

  return (
    <section ref={panel} tabIndex={-1} aria-labelledby="persetujuan-judul" className={gaya.panel} onKeyDown={tutup}>
      <div className={`kontainer ${gaya.isi}`}>
        <div className={gaya.teks}>
          <p id="persetujuan-judul" className={gaya.judul}>
            {teks.judul}
          </p>
          <p>{teks.isi}</p>
          <p>
            Pilihanmu disimpan 12 bulan dan bisa kamu ubah kapan saja lewat Pengaturan cookie di bagian bawah halaman.{' '}
            <Tautan href={kebijakan}>Baca Kebijakan Privasi</Tautan>
          </p>
          {sekarang && <p className={gaya.sekarang}>Pilihanmu sekarang: {LABEL[sekarang]}.</p>}
        </div>
        <div className={gaya.pilihan}>
          <button type="button" className={gaya.tombol} onClick={() => pilih('perlu')}>
            {LABEL.perlu}
          </button>
          <button type="button" className={gaya.tombol} onClick={() => pilih('semua')}>
            {LABEL.semua}
          </button>
        </div>
      </div>
    </section>
  )
}
