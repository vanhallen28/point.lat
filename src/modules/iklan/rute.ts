import { respons } from '@/modules/seo/rute'

/**
 * Jawaban `/ads.txt`: isi teks polos (`text/plain`, syarat spesifikasi IAB ads.txt) dengan header cache
 * rute teknis lain, atau 404 bila tidak ada baris. Menurut spesifikasi IAB, 404 berarti situs tidak
 * mendeklarasikan penjual; file kosong tidak sah.
 */
export function responsAdsTxt(isi: string | null): Response {
  if (!isi) return new Response('Tidak ditemukan.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  return respons(isi, 'teks')
}
