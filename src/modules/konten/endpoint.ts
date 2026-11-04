import type { Endpoint } from 'payload'

import { catat404, rapikanLog404 } from './log404'

/** Path endpoint di bawah `/api/log-404`, dipanggil beacon halaman 404. */
export const PATH_CATAT_404 = '/catat'

/**
 * `POST /api/log-404/catat`: dipanggil browser pembaca dari halaman 404 (`navigator.sendBeacon`).
 * Terbuka tanpa login karena pembacanya anonim; isi dirapikan `rapikanLog404` dan ditulis lewat Local
 * API. Pencatatan dari browser dipilih karena halaman 404 disimpan cache (ISR), jadi server tidak
 * merender ulang setiap kunjungan.
 */
export const endpointCatat404: Endpoint = {
  path: PATH_CATAT_404,
  method: 'post',
  handler: async (req) => {
    const catatan = rapikanLog404(await req.json?.().catch(() => null))
    if (!catatan) return Response.json({ pesan: 'Path tidak dicatat.' }, { status: 400 })
    await catat404(req.payload, catatan)
    return new Response(null, { status: 204 })
  },
}
