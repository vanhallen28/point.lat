import type { Endpoint, PayloadRequest } from 'payload'

import { jalankan, type PenggunaAi } from './jalankan'
import { statusAsisten } from './status'
import { TUGAS_AI, type TugasAi } from './tipe'

/** Path endpoint di bawah `/api/artikel`, dipanggil sidebar Asisten AI di editor artikel. */
export const PATH_ASISTEN = '/asisten'

const PERAN_ASISTEN = new Set(['admin', 'editor'])

const galat = (status: number, pesan: string) => Response.json({ status: 'gagal', pesan }, { status })

/** Pengguna yang boleh memakai asisten (admin dan editor), atau jawaban galat. */
function penggunaAsisten(req: PayloadRequest): PenggunaAi | Response {
  const user = req.user as (PenggunaAi & { collection?: string }) | null
  if (!user) return galat(401, 'Masuk dulu untuk memakai asisten AI.')
  if (!PERAN_ASISTEN.has(user.peran ?? '')) return galat(403, 'Asisten AI hanya untuk admin dan editor.')
  return user
}

/** ID artikel dari body: bilangan bulat positif, selain itu `null`. */
function idArtikel(nilai: unknown): number | null {
  const angka = typeof nilai === 'string' && /^\d+$/.test(nilai) ? Number(nilai) : nilai
  return typeof angka === 'number' && Number.isInteger(angka) && angka > 0 ? angka : null
}

/**
 * `POST /api/artikel/asisten` dengan body `{ tugas, masukan, dokumen }`: menjalankan satu tugas AI. Jawaban
 * `{ status: 'berhasil', hasil, ... }` atau `{ status: 'gagal', alasan, pesan }` dengan status HTTP yang
 * sesuai (400 masukan, 402 anggaran, 429 batas per menit, 502 galat Claude, 503 asisten tidak siap).
 */
export const endpointAsisten: Endpoint = {
  path: PATH_ASISTEN,
  method: 'post',
  handler: async (req) => {
    const pengguna = penggunaAsisten(req)
    if (pengguna instanceof Response) return pengguna
    const body = ((await req.json?.().catch(() => null)) ?? {}) as { tugas?: unknown; masukan?: unknown; dokumen?: unknown }
    if (!TUGAS_AI.includes(body.tugas as TugasAi)) return galat(400, 'Tugas asisten tidak dikenal.')
    const hasil = await jalankan(req.payload, body.tugas as TugasAi, body.masukan, { pengguna, dokumen: idArtikel(body.dokumen) })
    return Response.json(hasil, { status: hasil.status === 'berhasil' ? 200 : hasil.kodeHttp })
  },
}

/** `GET /api/artikel/asisten`: status asisten untuk sidebar (siap atau tidak dan kenapa, anggaran, frasa tambahan). */
export const endpointStatusAsisten: Endpoint = {
  path: PATH_ASISTEN,
  method: 'get',
  handler: async (req) => {
    const pengguna = penggunaAsisten(req)
    if (pengguna instanceof Response) return pengguna
    return Response.json(await statusAsisten(req.payload))
  },
}
