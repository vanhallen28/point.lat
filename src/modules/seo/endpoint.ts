import { APIError, type Endpoint, type Payload, type PayloadRequest, type Where } from 'payload'

import { pathFor } from '@/lib/paths'
import { klienMedia } from '@/modules/media'

import { urlAbsolut } from './dokumen'
import { cariKanibalisasi, sarankanLink, type ArtikelLain } from './kemiripan'
import type { DataPanel, MasukanPanel } from './panel'
import type { PengaturanSitus } from './tipe'

/** Path endpoint di bawah `/api/artikel`, dipanggil komponen panel SEO. */
export const PATH_PANEL_SEO = '/panel-seo'

/** Jumlah artikel lain yang dibandingkan. Cukup untuk MVP; Rencana 6 bisa memindahkannya ke indeks. */
const BATAS_PEMBANDING = 500

/** ID dokumen Postgres: bilangan bulat positif (angka atau teks angka dari form admin). */
function idValid(nilai: unknown): number | null {
  const angka = typeof nilai === 'string' && /^\d+$/.test(nilai) ? Number(nilai) : nilai
  return typeof angka === 'number' && Number.isInteger(angka) && angka > 0 ? angka : null
}

const daftarId = (nilai: unknown): number[] =>
  Array.isArray(nilai) ? nilai.map(idValid).filter((v): v is number => v !== null) : []

/** Membaca dan merapikan body permintaan. Nilai yang bukan ID valid dibuang. */
export function bacaMasukan(body: unknown): MasukanPanel {
  const b = (body ?? {}) as Record<string, unknown>
  const teks = (v: unknown) => (typeof v === 'string' ? v : null)
  const id = idValid
  return {
    id: id(b.id),
    pilar: id(b.pilar),
    keyphrase: teks(b.keyphrase),
    keyphraseSekunder: Array.isArray(b.keyphraseSekunder) ? b.keyphraseSekunder.filter((k): k is string => typeof k === 'string') : [],
    tertaut: daftarId(b.tertaut),
    media: daftarId(b.media).slice(0, 50),
  }
}

/**
 * Artikel lain (termasuk draf) sebagai kandidat kanibalisasi dan saran link internal. Dipakai panel SEO dan
 * brief Asisten AI (Rencana 7), jadi aturan pemilihannya satu.
 */
export async function artikelLain(payload: Payload, id: MasukanPanel['id'], req?: PayloadRequest): Promise<ArtikelLain[]> {
  const where: Where = id ? { id: { not_equals: id } } : {}
  const { docs } = await payload.find({
    collection: 'artikel',
    where,
    depth: 0,
    limit: BATAS_PEMBANDING,
    pagination: false,
    draft: true,
    sort: '-updatedAt',
    select: { judul: true, slug: true, tipe: true, pilar: true, seo: { keyphrase: true, keyphraseSekunder: true } },
    req,
  })
  return docs.map((doc) => ({
    id: doc.id,
    judul: doc.judul || 'Tanpa judul',
    path: doc.slug ? pathFor({ jenis: 'artikel', slug: doc.slug, tipe: doc.tipe ?? 'panduan' }) : '',
    pilarId: typeof doc.pilar === 'object' ? doc.pilar?.id : doc.pilar,
    keyphrase: doc.seo?.keyphrase,
    keyphraseSekunder: doc.seo?.keyphraseSekunder,
  }))
}

/**
 * `POST /api/artikel/panel-seo`: data server untuk panel SEO. Hanya pengguna yang masuk. Membaca
 * artikel lain (termasuk draf, supaya kanibalisasi terlihat sebelum terbit), media yang dipakai
 * dokumen, dan pengaturan situs. Logika pemilihan ada di `kemiripan.ts`.
 */
export const endpointPanelSeo: Endpoint = {
  path: PATH_PANEL_SEO,
  method: 'post',
  handler: async (req) => {
    if (!req.user) throw new APIError('Masuk dulu untuk memakai panel SEO.', 401)
    const masukan = bacaMasukan(await req.json?.().catch(() => null))
    const admin = req.payload.config.routes.admin

    const [pengaturan, lain, pilarDoc, mediaDocs] = await Promise.all([
      req.payload.findGlobal({ slug: 'pengaturan-seo', depth: 0, req }) as Promise<PengaturanSitus>,
      artikelLain(req.payload, masukan.id, req),
      masukan.pilar
        ? req.payload.findByID({ collection: 'pilar', id: masukan.pilar, depth: 0, req, disableErrors: true })
        : Promise.resolve(null),
      masukan.media?.length
        ? req.payload
            .find({
              collection: 'media',
              where: { id: { in: masukan.media } },
              depth: 0,
              limit: masukan.media.length,
              select: { alt: true, width: true, height: true, publicId: true, jenis: true },
              req,
            })
            .then((r) => r.docs)
        : Promise.resolve([]),
    ])

    const urlAdmin = (id: number | string) => `${admin}/collections/artikel/${id}`
    const situs = { urlSitus: pengaturan.urlSitus }
    const data: DataPanel = {
      situs: {
        namaSitus: pengaturan.namaSitus,
        urlSitus: pengaturan.urlSitus,
        polaJudul: pengaturan.polaJudul,
        metaDefault: pengaturan.metaDefault,
        cloudName: klienMedia().cloudName,
      },
      pilar: pilarDoc ? { id: pilarDoc.id, nama: pilarDoc.nama, slug: pilarDoc.slug, warna: pilarDoc.warna } : null,
      media: Object.fromEntries(
        mediaDocs.map((m) => [String(m.id), { id: m.id, alt: m.alt ?? null, width: m.width, height: m.height, publicId: m.publicId, jenis: m.jenis }]),
      ),
      kanibalisasi: cariKanibalisasi(masukan.keyphrase, lain).map((a) => ({ ...a, urlAdmin: urlAdmin(a.id) })),
      saran: sarankanLink({ pilarId: masukan.pilar, keyphrase: masukan.keyphrase, keyphraseSekunder: masukan.keyphraseSekunder }, lain, {
        sudahDitautkan: masukan.tertaut,
      }).map((s) => ({ ...s, urlAdmin: urlAdmin(s.id), url: s.path ? urlAbsolut(situs, s.path) : '' })),
    }
    return Response.json(data)
  },
}
