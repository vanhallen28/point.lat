'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** 200 ms per kartu + 2 jeda 40 ms = 280 ms, di bawah batas 300 ms spesifikasi §13. */
export const MAKS_URUTAN = 2

/**
 * Animasi masuk kartu (spesifikasi §13): naik 12px + opacity, berurutan 40 ms, sekali saat pertama
 * terlihat. Hanya elemen `[data-masuk]` yang masih di bawah layar saat halaman tampil yang disiapkan
 * (`tunggu`), supaya yang sudah terlihat tidak berkedip. Tanpa JavaScript atau dengan reduced motion,
 * kartu tampil biasa.
 */
export function PemicuMasuk() {
  const path = usePathname()
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const tinggi = window.innerHeight
    const kartu = [...document.querySelectorAll<HTMLElement>('[data-masuk=""]')].filter(
      (el) => el.getBoundingClientRect().top > tinggi,
    )
    const pengamat = new IntersectionObserver((entri) => {
      let urutan = 0
      for (const e of entri) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        el.style.setProperty('--urutan', String(Math.min(urutan++, MAKS_URUTAN)))
        el.dataset.masuk = 'terlihat'
        pengamat.unobserve(el)
      }
    })
    for (const el of kartu) {
      el.dataset.masuk = 'tunggu'
      pengamat.observe(el)
    }
    return () => pengamat.disconnect()
  }, [path])
  return null
}
