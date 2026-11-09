import type { Endpoint, PayloadRequest } from 'payload'

import { ambilFitur, newsletterFormAktif } from '@/modules/fitur/data'

import { ambilIp, bacaIsian, kenaJebakan, lewatBatas, periksaBerhenti, periksaDaftar, periksaKontak, rapikanAsal, sidikPengirim, type Isian } from './aturan'
import { csvPelanggan, hapusPelanggan, kirimanSejam, simpanPelanggan, simpanPesan, type KoleksiPembaca } from './data'
import { FRAGMEN, MAKS_ISIAN_FORM, type HasilPeriksa } from './tipe'

/** Path endpoint di bawah koleksinya: `/api/pesan-masuk/kirim`, `/api/pelanggan-newsletter/{daftar,berhenti,csv}`. */
export const PATH_PEMBACA = { kirim: '/kirim', daftar: '/daftar', berhenti: '/berhenti', csv: '/csv' } as const

type Pesan = { berhasil: string; gagal: string; fragmenBerhasil: string; fragmenGagal: string }

/** Jawaban sesuai cara form dikirim: JSON untuk form dengan JavaScript, 303 ke halaman asal untuk form biasa. */
function penjawab(req: PayloadRequest, asal: string, pesan: Pesan) {
  const json = (req.headers.get('content-type') ?? '').includes('application/json')
  return {
    berhasil: () =>
      json
        ? Response.json({ status: 'berhasil', pesan: pesan.berhasil })
        : new Response(null, { status: 303, headers: { Location: `${asal}#${pesan.fragmenBerhasil}` } }),
    gagal: (status: number, teks: string, galat?: Record<string, string>) =>
      json
        ? Response.json({ status: 'gagal', pesan: teks, galat: galat ?? {} }, { status })
        : new Response(null, { status: 303, headers: { Location: `${asal}#${pesan.fragmenGagal}` } }),
  }
}

type Aturan<T> = {
  pesan: Pesan
  /** Fitur menyala; selain itu dijawab 404. */
  aktif: (req: PayloadRequest) => Promise<boolean>
  periksa: (isian: Isian) => HasilPeriksa<T>
  /** Koleksi untuk batas kiriman per sidik, atau `null` bila tanpa batas (berhenti langganan). */
  batas: KoleksiPembaca | null
  simpan: (req: PayloadRequest, data: T, asal: string, sidik: string, sekarang: Date) => Promise<void>
}

/**
 * Alur bersama form pembaca (spesifikasi §23). Terbuka tanpa login karena pengirimnya anonim. Penjaga:
 * `Sec-Fetch-Site` harus `same-origin` bila ada, isian paling besar 10 KB, kolom jebakan (dijawab seperti berhasil
 * tanpa disimpan), pemeriksaan isian, dan batas 5 kiriman per jam per sidik pengirim (HMAC IP, tanpa IP mentah).
 */
function endpointForm<T>(path: string, aturan: Aturan<T>): Endpoint {
  return {
    path,
    method: 'post',
    handler: async (req) => {
      const sekarang = new Date()
      const teksMentah = Number(req.headers.get('content-length') ?? 0) > MAKS_ISIAN_FORM ? null : ((await req.text?.().catch(() => '')) ?? '')
      const isian = teksMentah && teksMentah.length <= MAKS_ISIAN_FORM ? bacaIsian(teksMentah, req.headers.get('content-type')) : {}
      const jawab = penjawab(req, rapikanAsal(isian.asal), aturan.pesan)
      const situs = req.headers.get('sec-fetch-site')
      if (situs && situs !== 'same-origin') return jawab.gagal(403, 'Kiriman dari situs lain ditolak.')
      if (teksMentah === null || teksMentah.length > MAKS_ISIAN_FORM) return jawab.gagal(413, 'Isian terlalu panjang.')
      if (!(await aturan.aktif(req))) return jawab.gagal(404, 'Form ini sedang tidak aktif.')
      if (kenaJebakan(isian)) return jawab.berhasil()
      const hasil = aturan.periksa(isian)
      if (!hasil.ok) return jawab.gagal(400, 'Periksa lagi isianmu.', hasil.galat)
      const sidik = sidikPengirim(ambilIp(req.headers), process.env.PAYLOAD_SECRET ?? '', sekarang)
      if (aturan.batas && lewatBatas(await kirimanSejam(req.payload, aturan.batas, sidik, sekarang))) {
        return jawab.gagal(429, 'Terlalu banyak kiriman dari perangkatmu. Coba lagi satu jam lagi.')
      }
      await aturan.simpan(req, hasil.data, rapikanAsal(isian.asal), sidik, sekarang)
      return jawab.berhasil()
    },
  }
}

const newsletterAktif = async (req: PayloadRequest) => {
  const [fitur, newsletter] = await Promise.all([ambilFitur(req.payload), req.payload.findGlobal({ slug: 'newsletter', depth: 0 })])
  return newsletterFormAktif(fitur, newsletter)
}

/** `POST /api/pesan-masuk/kirim`: form kontak. */
export const endpointKirimPesan = endpointForm(PATH_PEMBACA.kirim, {
  pesan: {
    berhasil: 'Pesanmu sudah kami terima. Terima kasih.',
    gagal: 'Pesan belum terkirim.',
    fragmenBerhasil: FRAGMEN.pesanTerkirim,
    fragmenGagal: FRAGMEN.pesanGagal,
  },
  aktif: async (req) => (await ambilFitur(req.payload)).formKontak,
  periksa: periksaKontak,
  batas: 'pesan-masuk',
  simpan: (req, data, asal, sidik) => simpanPesan(req.payload, data, asal, sidik),
})

/** `POST /api/pelanggan-newsletter/daftar`: form newsletter. */
export const endpointDaftar = endpointForm(PATH_PEMBACA.daftar, {
  pesan: {
    berhasil: 'Kamu sudah terdaftar. Terima kasih.',
    gagal: 'Pendaftaran belum berhasil.',
    fragmenBerhasil: FRAGMEN.daftarBerhasil,
    fragmenGagal: FRAGMEN.daftarGagal,
  },
  aktif: newsletterAktif,
  periksa: periksaDaftar,
  batas: 'pelanggan-newsletter',
  simpan: (req, data, asal, sidik, sekarang) => simpanPelanggan(req.payload, data.email, asal, sidik, sekarang),
})

/** `POST /api/pelanggan-newsletter/berhenti`: berhenti langganan. Berlaku walau newsletter sedang dimatikan. */
export const endpointBerhenti = endpointForm(PATH_PEMBACA.berhenti, {
  pesan: {
    berhasil: 'Email itu sudah tidak ada di daftar newsletter.',
    gagal: 'Permintaan belum berhasil.',
    fragmenBerhasil: FRAGMEN.berhentiBerhasil,
    fragmenGagal: FRAGMEN.berhentiGagal,
  },
  aktif: async () => true,
  periksa: periksaBerhenti,
  batas: null,
  simpan: (req, data) => hapusPelanggan(req.payload, data.email),
})

/** `GET /api/pelanggan-newsletter/csv`: unduh daftar pelanggan, hanya admin. */
export const endpointCsv: Endpoint = {
  path: PATH_PEMBACA.csv,
  method: 'get',
  handler: async (req) => {
    if ((req.user as { peran?: string | null } | null)?.peran !== 'admin') {
      return Response.json({ status: 'gagal', pesan: 'Hanya admin yang bisa mengunduh daftar pelanggan.' }, { status: req.user ? 403 : 401 })
    }
    const tanggal = new Date().toISOString().slice(0, 10)
    return new Response(`\ufeff${await csvPelanggan(req.payload)}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pelanggan-newsletter-${tanggal}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  },
}
