import type { Endpoint } from 'payload'

import { catat404, MAKS_ISIAN_404, rapikanLog404 } from './log404'

/** Path endpoint di bawah `/api/log-404`, dipanggil beacon halaman 404. */
export const PATH_CATAT_404 = '/catat'

const tidakDicatat = () => Response.json({ pesan: 'Path tidak dicatat.' }, { status: 400 })

/** Isi JSON beacon, atau `null` bila bukan JSON. */
function bacaJson(teks: string): unknown {
  try {
    return JSON.parse(teks)
  } catch {
    return null
  }
}

/**
 * `POST /api/log-404/catat`: dipanggil browser pembaca dari halaman 404 (`navigator.sendBeacon`).
 * Terbuka tanpa login karena pembacanya anonim; isi dirapikan `rapikanLog404` dan ditulis lewat SQL
 * atomik `catat404`. Pencatatan dari browser dipilih karena halaman 404 disimpan cache (ISR), jadi server
 * tidak merender ulang setiap kunjungan.
 *
 * Penjaga di aplikasi (Rencana 8B), tanpa menyimpan IP: isian lebih dari 2 KB ditolak sebelum dibaca
 * utuh; kiriman dari halaman situs lain (`Sec-Fetch-Site` selain `same-origin`) dan path baru di atas batas
 * 24 jam diabaikan dengan jawaban yang sama dengan kiriman yang dicatat (204), jadi pengirim tidak tahu
 * batasnya. Batas laju per IP diatur di Vercel Firewall (lihat Setup dari pemilik Rencana 8B).
 */
export const endpointCatat404: Endpoint = {
  path: PATH_CATAT_404,
  method: 'post',
  handler: async (req) => {
    const asal = req.headers.get('sec-fetch-site')
    if (asal && asal !== 'same-origin') return new Response(null, { status: 204 })
    if (Number(req.headers.get('content-length') ?? 0) > MAKS_ISIAN_404) return tidakDicatat()
    const teks = (await req.text?.().catch(() => '')) ?? ''
    if (teks.length > MAKS_ISIAN_404) return tidakDicatat()
    const catatan = rapikanLog404(bacaJson(teks))
    if (!catatan) return tidakDicatat()
    await catat404(req.payload, catatan)
    return new Response(null, { status: 204 })
  },
}
