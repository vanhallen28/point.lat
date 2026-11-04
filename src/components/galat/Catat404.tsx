'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const ENDPOINT = '/api/log-404/catat'

/**
 * Mencatat kunjungan ke halaman 404 ke koleksi `log-404` lewat beacon. Halaman 404 disimpan cache
 * (ISR), jadi pencatatan dilakukan dari browser di setiap kunjungan, termasuk navigasi klien.
 */
export function Catat404() {
  const path = usePathname()
  useEffect(() => {
    const data = JSON.stringify({ path: window.location.pathname, referer: document.referrer || null })
    const terkirim = navigator.sendBeacon?.(ENDPOINT, new Blob([data], { type: 'application/json' }))
    if (!terkirim) {
      void fetch(ENDPOINT, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  }, [path])
  return null
}
