import { ViewTransition, type ReactNode } from 'react'

/**
 * React di Next memakai versi canary yang punya `ViewTransition`; React stabil di tes unit belum,
 * jadi komponen ini merender anaknya apa adanya bila `ViewTransition` tidak ada.
 */
const Transisi: typeof ViewTransition | undefined = ViewTransition

export const namaJudulBersama = (id: number | string) => `judul-artikel-${id}`

/**
 * Elemen bersama View Transitions (spesifikasi §13): judul kartu artikel berpindah menjadi H1
 * artikel saat navigasi klien. `default="none"` supaya hanya pasangan kartu dan judul yang
 * beranimasi; kelas `morph` diatur di `dasar.css` (400 ms, kurva khas).
 */
export function JudulBersama({ id, children }: { id: number | string; children: ReactNode }) {
  if (!Transisi) return <>{children}</>
  return (
    <Transisi name={namaJudulBersama(id)} share="morph" default="none">
      {children}
    </Transisi>
  )
}
