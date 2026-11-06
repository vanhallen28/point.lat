import type { Endpoint } from 'payload'

import { tolakSelainAdmin } from '@/lib/aksiAdmin'

import { jalankanPantauSetelahRespons, mintaPindai } from './index'

/** Path endpoint di bawah `/api/tugas-seo`, dipanggil tombol "Pindai ulang sekarang" di dashboard SEO. */
export const PATH_PINDAI_ULANG = '/pindai'

/**
 * `POST /api/tugas-seo/pindai`: "Pindai ulang sekarang" (hanya admin, dari admin situs sendiri). Tugas pindai
 * tautan dimajukan lalu dijalankan setelah respons terkirim (`after()`). Jawaban 202 (antre) atau 429
 * (sedang berjalan, atau jeda 10 menit sejak pindai terakhir dimulai).
 */
export const endpointPindaiUlang: Endpoint = {
  path: PATH_PINDAI_ULANG,
  method: 'post',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    const hasil = await mintaPindai(req.payload)
    if (hasil.status === 'antre') jalankanPantauSetelahRespons(req.payload, ['tautan'])
    return Response.json(hasil, { status: hasil.status === 'antre' ? 202 : 429 })
  },
}
