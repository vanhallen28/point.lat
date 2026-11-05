import type { HasilJalankan } from '../jalankan'
import type { StatusAsisten } from '../status'
import type { TugasAi } from '../tipe'

/**
 * Permintaan sidebar Asisten AI ke `/api/artikel/asisten`. Aman untuk browser: hanya `fetch` dan tipe.
 * Galat jaringan dan jawaban yang tidak terbaca menjadi pesan untuk editor, tidak pernah dilempar.
 */

export type JawabanAsisten = HasilJalankan | { status: 'gagal'; pesan: string }

const PESAN_JARINGAN = 'Permintaan ke server gagal. Periksa koneksi, lalu coba lagi.'

export async function mintaTugas(url: string, tugas: TugasAi, masukan: unknown, dokumen: number | string | null | undefined): Promise<JawabanAsisten> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tugas, masukan, dokumen: dokumen ?? null }),
    })
    const data = (await res.json().catch(() => null)) as JawabanAsisten | null
    if (data && (data.status === 'berhasil' || data.status === 'gagal')) return data
    return { status: 'gagal', pesan: `Server menjawab ${res.status}. Coba lagi.` }
  } catch {
    return { status: 'gagal', pesan: PESAN_JARINGAN }
  }
}

export async function mintaStatus(url: string): Promise<StatusAsisten | { pesan: string }> {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return { pesan: `Status asisten tidak bisa dimuat (${res.status}). Muat ulang halaman.` }
    return (await res.json()) as StatusAsisten
  } catch {
    return { pesan: PESAN_JARINGAN }
  }
}
