import { potongKata } from './teks'

/**
 * Teks pratinjau hasil Google dan kartu sosial di panel SEO (spesifikasi §8 butir 5).
 *
 * Google memotong judul berdasarkan lebar piksel, bukan jumlah karakter, jadi batas di sini adalah
 * perkiraan yang lazim dipakai plugin SEO: judul sekitar 60 karakter di desktop dan 70 di HP, meta
 * sekitar 160 karakter di desktop dan 120 di HP. Pratinjau memberi gambaran, bukan jaminan.
 */
export const POTONG = {
  desktop: { judul: 60, deskripsi: 160 },
  hp: { judul: 70, deskripsi: 120 },
  /** WhatsApp, Facebook, dan X menampilkan judul lebih pendek di kartu tautan. */
  sosial: { judul: 65, deskripsi: 110 },
} as const

export type Perangkat = keyof typeof POTONG

/** URL tampilan Google: domain lalu remah path dipisah " › ", tanpa protokol. */
export function urlTampil(url: string): string {
  try {
    const u = new URL(url)
    const bagian = u.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    return [u.host, ...bagian].join(' › ')
  } catch {
    return url
  }
}

export type TeksPratinjau = { judul: string; deskripsi: string; url: string; domain: string }

export function teksPratinjau(
  data: { judul: string; deskripsi: string; url: string },
  perangkat: Perangkat,
): TeksPratinjau {
  const batas = POTONG[perangkat]
  let domain = data.url
  try {
    domain = new URL(data.url).host
  } catch {
    // URL tidak valid ditampilkan apa adanya.
  }
  return {
    judul: potongKata(data.judul, batas.judul),
    deskripsi: potongKata(data.deskripsi, batas.deskripsi),
    url: perangkat === 'sosial' ? domain.toUpperCase() : urlTampil(data.url),
    domain,
  }
}
