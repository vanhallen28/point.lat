import { after } from 'next/server'
import type { Endpoint, Payload, PayloadRequest } from 'payload'

import { tolakSelainAdmin } from '@/lib/aksiAdmin'
import { izinCron } from '@/modules/indexer/cron'

import { antrekanTerbit, bacaTerakhir, keluarkanDariAntrean } from './data'
import { jalankanOtomasi, sedangBerjalan } from './jalan'

/**
 * Endpoint Otomasi artikel (spesifikasi §27) di bawah `/api/usulan-topik`:
 * - `GET /jalan`: cron Vercel (`Authorization: Bearer CRON_SECRET`) atau admin yang masuk; satu jalan otomasi.
 * - `POST /aksi` `{ aksi: 'usulan' | 'tulis' | 'antre' }`: tombol beranda admin. Usulan dan tulis berjalan setelah
 *   respons (`after()`, 202) karena bisa sampai tiga menit; antre langsung (200).
 * - `POST /:id/status` `{ status: 'disetujui' | 'ditolak' | 'keluar' }`: setujui, tolak, atau keluarkan dari antrean.
 * - `GET /keadaan`: jalan yang sedang berlangsung dan catatan terakhir, untuk tombol yang menunggu hasil.
 */

const json = (data: unknown, status = 200) => Response.json(data, { status })

/** Menjalankan pekerjaan setelah respons; di luar permintaan Next (tes) dijalankan langsung. */
async function setelahRespons(payload: Payload, kerja: () => Promise<unknown>): Promise<boolean> {
  const aman = async () => {
    try {
      await kerja()
    } catch (galat) {
      payload.logger.error({ err: galat, msg: 'Otomasi artikel gagal.' })
    }
  }
  try {
    after(aman)
    return true
  } catch (galat) {
    if (!String((galat as Error)?.message).includes('outside a request scope')) throw galat
    await aman()
    return false
  }
}

const endpointJalan: Endpoint = {
  path: '/jalan',
  method: 'get',
  handler: async (req) => {
    const admin = (req.user as { peran?: string | null } | null | undefined)?.peran === 'admin'
    if (!admin && !izinCron(req.headers.get('authorization'), process.env.CRON_SECRET)) {
      return json({ pesan: 'Butuh header Authorization: Bearer CRON_SECRET, atau masuk sebagai admin.' }, 401)
    }
    return json(await jalankanOtomasi(req.payload))
  },
}

async function bacaBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  return ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
}

const endpointAksi: Endpoint = {
  path: '/aksi',
  method: 'post',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    const { aksi } = await bacaBody(req)
    if (aksi === 'antre') {
      const hasil = await antrekanTerbit(req.payload, { paksa: true })
      const pesan = hasil.diantre.length
        ? `${hasil.diantre.length} draf masuk antrean terbit.`
        : hasil.belumSiap
          ? `${hasil.belumSiap} draf belum siap: lengkapi checklist review dan hapus penanda [cek angka].`
          : 'Tidak ada draf baru yang siap diantre.'
      return json({ status: 'selesai', pesan, hasil })
    }
    if (aksi !== 'usulan' && aksi !== 'tulis') return json({ status: 'gagal', pesan: 'Aksi tidak dikenal.' }, 400)
    if (await sedangBerjalan(req.payload)) return json({ status: 'berjalan', pesan: 'Otomasi sedang berjalan. Tunggu sampai selesai.' }, 429)
    const nanti = await setelahRespons(req.payload, () => jalankanOtomasi(req.payload, { paksa: aksi }))
    const pesan = aksi === 'usulan' ? 'Meminta usulan topik. Biasanya selesai dalam satu menit.' : 'Menulis satu draf. Biasanya dua sampai tiga menit.'
    return json({ status: nanti ? 'antre' : 'selesai', pesan }, nanti ? 202 : 200)
  },
}

const endpointStatus: Endpoint = {
  path: '/:id/status',
  method: 'post',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    const id = Number(req.routeParams?.id)
    const { status } = await bacaBody(req)
    if (!Number.isInteger(id) || id <= 0) return json({ status: 'gagal', pesan: 'Usulan tidak dikenal.' }, 404)
    if (status === 'keluar') {
      const ok = await keluarkanDariAntrean(req.payload, id)
      return json({ status: ok ? 'selesai' : 'gagal', pesan: ok ? 'Draf dikeluarkan dari antrean terbit.' : 'Usulan tidak ditemukan.' }, ok ? 200 : 404)
    }
    if (status !== 'disetujui' && status !== 'ditolak') return json({ status: 'gagal', pesan: 'Status tidak dikenal.' }, 400)
    const u = await req.payload.findByID({ collection: 'usulan-topik', id, depth: 0, overrideAccess: true, disableErrors: true })
    if (!u) return json({ status: 'gagal', pesan: 'Usulan tidak ditemukan.' }, 404)
    if (!['usulan', 'disetujui', 'ditolak', 'gagal'].includes(u.status)) {
      return json({ status: 'gagal', pesan: 'Usulan ini sudah ditulis, jadi statusnya tidak bisa diubah di sini.' }, 409)
    }
    await req.payload.update({ collection: 'usulan-topik', id, data: { status, ...(status === 'disetujui' ? { percobaan: 0, pesan: null } : {}) }, req })
    return json({ status: 'selesai', pesan: status === 'disetujui' ? 'Disetujui. Akan ditulis di jalan otomasi berikutnya.' : 'Ditolak.' })
  },
}

const endpointKeadaan: Endpoint = {
  path: '/keadaan',
  method: 'get',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    const [berjalan, terakhir] = await Promise.all([sedangBerjalan(req.payload), bacaTerakhir(req.payload)])
    return json({ berjalan, terakhir })
  },
}

export const endpointOtomasi: Endpoint[] = [endpointJalan, endpointAksi, endpointStatus, endpointKeadaan]
