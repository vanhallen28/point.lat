import type { Endpoint, PayloadRequest } from 'payload'

import { ambilIp } from '@/modules/pembaca/aturan'

import {
  apakahBot,
  bacaKiriman,
  bacaRentang,
  hostDari,
  isiCsvKunjungan,
  jenisPerangkat,
  MAKS_ISIAN,
  namaPeramban,
  rapikanKota,
  rapikanNegara,
} from './aturan'
import { barisCsvKunjungan, catatKunjungan } from './data'

const selesai = () => new Response(null, { status: 204 })

/** Nama cookie login Payload (`cookiePrefix` bawaan). Tayangan oleh pengguna admin yang sedang masuk tidak dihitung. */
const KUKI_MASUK = /(^|;\s*)payload-token=/

/** Host situs dari `NEXT_PUBLIC_SITE_URL` dan permintaan, untuk mengenali perpindahan halaman di dalam point. */
function hostSitus(req: PayloadRequest): string[] {
  const host = [hostDari(process.env.NEXT_PUBLIC_SITE_URL), req.headers.get('x-forwarded-host'), req.headers.get('host')]
  return [...new Set(host.filter((h): h is string => Boolean(h)).map((h) => h.toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '')))]
}

/**
 * `POST /api/kunjungan/catat`: beacon skrip `skripKunjungan` (spesifikasi §26), terbuka tanpa login. Selalu menjawab
 * 204, juga untuk kiriman yang diabaikan (pengirim tidak tahu aturannya): dari situs lain (`Sec-Fetch-Site`),
 * isian lebih dari 1 KB atau cacat, bot dan alat otomatis, pengguna admin yang sedang masuk, dan yang lewat batas
 * per menit atau per hari (`catatKunjungan`). Negara dan kota dari header geolokasi Vercel; IP hanya dipakai untuk
 * sidik harian dan tidak disimpan.
 */
export const endpointCatatKunjungan: Endpoint = {
  path: '/catat',
  method: 'post',
  handler: async (req) => {
    const asal = req.headers.get('sec-fetch-site')
    if (asal && asal !== 'same-origin') return selesai()
    if (Number(req.headers.get('content-length') ?? 0) > MAKS_ISIAN) return selesai()
    const ua = req.headers.get('user-agent') ?? ''
    if (apakahBot(ua)) return selesai()
    if (KUKI_MASUK.test(req.headers.get('cookie') ?? '')) return selesai()
    const kiriman = bacaKiriman((await req.text?.().catch(() => '')) ?? '')
    if (!kiriman) return selesai()
    try {
      await catatKunjungan(
        req.payload,
        kiriman,
        {
          ua,
          ip: ambilIp(req.headers),
          negara: rapikanNegara(req.headers.get('x-vercel-ip-country')),
          kota: rapikanKota(req.headers.get('x-vercel-ip-city')),
          hostSitus: hostSitus(req),
          perangkat: jenisPerangkat(ua),
          peramban: namaPeramban(ua),
        },
        process.env.PAYLOAD_SECRET ?? '',
      )
    } catch (galat) {
      // Statistik tidak boleh mengganggu pembaca: galat database hanya dicatat ke log server.
      req.payload.logger.error({ err: galat, msg: 'Kunjungan tidak tercatat' })
    }
    return selesai()
  },
}

/**
 * `GET /api/kunjungan/csv?dari=YYYY-MM-DD&sampai=YYYY-MM-DD` (atau `?kunjungan=7`): unduhan CSV statistik kunjungan
 * per hari dan dimensi untuk rentang yang sama dengan beranda admin. Hanya admin.
 */
export const endpointCsvKunjungan: Endpoint = {
  path: '/csv',
  method: 'get',
  handler: async (req) => {
    if ((req.user as { peran?: string | null } | null)?.peran !== 'admin') {
      return Response.json({ status: 'gagal', pesan: 'Hanya admin yang bisa mengunduh statistik kunjungan.' }, { status: req.user ? 403 : 401 })
    }
    const param = Object.fromEntries(new URL(req.url ?? 'http://localhost').searchParams)
    const rentang = bacaRentang(param, new Date())
    return new Response(`﻿${isiCsvKunjungan(await barisCsvKunjungan(req.payload, rentang))}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kunjungan-point-${rentang.dari}-sampai-${rentang.sampai}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  },
}
