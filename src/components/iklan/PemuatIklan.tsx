'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { atributUnit, urlSkrip } from '@/modules/iklan/adsense'
import { PERISTIWA_PERSETUJUAN } from '@/modules/iklan/peramban'
import { ATRIBUT_PERSETUJUAN } from '@/modules/iklan/persetujuan'

/** Unit diminta saat kotak tinggal 200 px dari layar, supaya iklan sudah ada saat kotak terlihat. */
const JARAK_MUAT = '200px 0px'

/**
 * Pemuat iklan (spesifikasi §11), sekali di layout. Setelah halaman interaktif dan hanya bila pengunjung
 * memilih Izinkan semua, setiap kotak `SlotIklan` diamati; saat hampir terlihat, skrip AdSense dimuat
 * (sekali per halaman) dan unit diisi. Kotak tersembunyi (Hanya yang perlu, layar terlalu sempit) tidak
 * pernah terlihat, jadi tidak pernah diminta. Diulang setiap pindah halaman dan setelah pengunjung memilih.
 */
export function PemuatIklan() {
  const path = usePathname()
  useEffect(() => {
    let pengamat: IntersectionObserver | null = null
    const mulai = () => {
      if (pengamat || document.documentElement.getAttribute(ATRIBUT_PERSETUJUAN) !== 'semua') return
      const kotak = document.querySelectorAll<HTMLElement>('[data-kotak-iklan]:not([data-dimuat])')
      if (kotak.length === 0) return
      const amati = new IntersectionObserver(
        (entri) => {
          for (const e of entri) {
            if (!e.isIntersecting) continue
            amati.unobserve(e.target)
            isiKotak(e.target as HTMLElement)
          }
        },
        { rootMargin: JARAK_MUAT },
      )
      for (const k of kotak) amati.observe(k)
      pengamat = amati
    }
    mulai()
    window.addEventListener(PERISTIWA_PERSETUJUAN, mulai)
    return () => {
      window.removeEventListener(PERISTIWA_PERSETUJUAN, mulai)
      pengamat?.disconnect()
    }
  }, [path])
  return null
}

/** Memuat skrip AdSense bila belum, lalu menambah satu `<ins>` berukuran tetap ke kotak dan memintanya diisi. */
function isiKotak(kotak: HTMLElement) {
  const { klien, unit, uji, lebar, tinggi } = kotak.dataset
  if (!klien || !unit) return
  kotak.dataset.dimuat = ''
  if (!document.querySelector('script[data-skrip-iklan]')) {
    const skrip = document.createElement('script')
    skrip.async = true
    skrip.crossOrigin = 'anonymous'
    skrip.src = urlSkrip(klien)
    skrip.dataset.skripIklan = ''
    document.head.append(skrip)
  }
  const ins = document.createElement('ins')
  for (const [nama, nilai] of Object.entries(atributUnit({ klien, unit, uji: uji === 'on', lebar: Number(lebar), tinggi: Number(tinggi) }))) {
    ins.setAttribute(nama, nilai)
  }
  kotak.append(ins)
  const w = window as unknown as { adsbygoogle?: object[] }
  w.adsbygoogle = w.adsbygoogle ?? []
  w.adsbygoogle.push({})
}
