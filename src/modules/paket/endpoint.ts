import { after } from 'next/server'
import type { Endpoint, Payload } from 'payload'

import { tolakSelainAdmin } from '@/lib/aksiAdmin'

import { imporPaket } from './impor'
import { ambilKunci, lepasKunci, simpanHasil } from './kunci'
import { bacaSampul } from './sampul'
import { statusPaket } from './status'

/** Path endpoint di bawah `/api/artikel`: tombol "Impor paket" di beranda admin. */
export const PATH_PAKET = '/paket-awal'

/** Menjalankan impor, menyimpan hasilnya, dan selalu melepas kunci (juga saat galat). */
async function jalankan(payload: Payload): Promise<void> {
  try {
    await simpanHasil(payload, await imporPaket(payload, { bacaSampul }))
  } catch (galat) {
    payload.logger.error({ err: galat, msg: 'Impor paket konten gagal.' })
    await simpanHasil(payload, {
      selesaiPada: new Date().toISOString(),
      artikel: { dibuat: [], sudahAda: [] },
      subkategori: { dibuat: [] },
      tools: { diperbarui: [], dilewati: [] },
      beranda: 'dilewati',
      galat: [(galat as Error).message],
    })
  } finally {
    await lepasKunci(payload)
  }
}

/**
 * `POST /api/artikel/paket-awal` (hanya admin, dari admin situs sendiri): impor paket konten dijalankan setelah
 * respons terkirim (`after()`), dengan kunci di `payload_kv` supaya klik ganda tidak mengimpor dua kali.
 * Jawaban 202 (antre) atau 429 (impor lain sedang berjalan). Di luar permintaan Next (tes), impor dijalankan
 * langsung dan dijawab 200.
 */
export const endpointImporPaket: Endpoint = {
  path: PATH_PAKET,
  method: 'post',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    if (!(await ambilKunci(req.payload))) {
      return Response.json({ status: 'berjalan', pesan: 'Impor sedang berjalan. Tunggu sampai selesai.' }, { status: 429 })
    }
    try {
      after(() => jalankan(req.payload))
    } catch (galat) {
      if (!String((galat as Error)?.message).includes('outside a request scope')) {
        await lepasKunci(req.payload)
        throw galat
      }
      await jalankan(req.payload)
      return Response.json({ status: 'selesai', pesan: 'Impor selesai.' }, { status: 200 })
    }
    return Response.json({ status: 'antre', pesan: 'Impor dimulai. Biasanya selesai dalam satu menit.' }, { status: 202 })
  },
}

/** `GET /api/artikel/paket-awal`: keadaan paket (hanya admin). */
export const endpointStatusPaket: Endpoint = {
  path: PATH_PAKET,
  method: 'get',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    return Response.json(await statusPaket(req.payload))
  },
}
