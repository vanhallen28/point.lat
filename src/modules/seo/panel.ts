import type { WarnaPilar } from '@/lib/konstanta'

import { analisis, type ArtikelAnalisis, type Cek } from './analisis'
import { deskripsiDokumen, gambarOgDokumen, judulSeo, pathDokumen, urlAbsolut, type GambarOg } from './dokumen'
import type { Kanibalisasi, SaranLink } from './kemiripan'
import { idGambarIsi, isiDenganMedia, tautanIsi, type GambarIsi, type IsiDokumen } from './lexical'
import { canonicalDokumen } from './metadata'
import { teksPratinjau, type TeksPratinjau } from './pratinjau'
import type { ArtikelSeo, MediaSeo, Relasi, Situs, TipeSchema } from './tipe'

/**
 * Logika panel SEO di editor yang tidak butuh React: mengubah isian form admin menjadi masukan
 * endpoint, lalu menggabungkan jawaban endpoint menjadi checklist dan pratinjau. Komponen
 * `PanelSeo.tsx` hanya merender hasilnya. File ini dipakai komponen klien, jadi tidak boleh
 * mengimpor modul server (Payload, SDK Cloudinary).
 */

/** Body `POST /api/artikel/panel-seo`. */
export type MasukanPanel = {
  id?: number | string | null
  pilar?: number | string | null
  keyphrase?: string | null
  keyphraseSekunder?: string[] | null
  /** ID artikel yang sudah ditautkan dari isi (link internal ke dokumen). */
  tertaut?: (number | string)[]
  /** ID media yang dipakai gambar utama, gambar OG, dan gambar di isi. */
  media?: (number | string)[]
}

export type DataPanel = {
  situs: Pick<Situs, 'namaSitus' | 'urlSitus' | 'polaJudul' | 'metaDefault' | 'cloudName'>
  pilar: { id: number | string; nama: string; slug?: string | null; warna: WarnaPilar } | null
  media: Record<string, GambarIsi & Pick<MediaSeo, 'publicId' | 'jenis' | 'height'>>
  kanibalisasi: (Kanibalisasi & { urlAdmin: string })[]
  saran: (SaranLink & { urlAdmin: string; url: string })[]
}

/** Isian form admin artikel (hasil `reduceFieldsToValues(fields, true)`). Relasi berupa ID. */
export type IsianArtikel = {
  id?: number | string
  judul?: string | null
  slug?: string | null
  tipe?: ArtikelSeo['tipe'] | null
  deck?: string | null
  pilar?: Relasi<{ id: number | string }>
  intinya?: { poin?: string | null }[] | null
  isi?: IsiDokumen
  sumber?: { url?: string | null }[] | null
  gambarUtama?: Relasi<MediaSeo>
  seo?: {
    keyphrase?: string | null
    keyphraseSekunder?: string[] | null
    judulSEO?: string | null
    metaDeskripsi?: string | null
    gambarOG?: Relasi<MediaSeo>
    canonical?: string | null
    tipeSchema?: TipeSchema | null
    noindex?: boolean | null
  } | null
}

const daftar = <T>(nilai: unknown): T[] => (Array.isArray(nilai) ? (nilai as T[]) : [])

/**
 * Merapikan hasil `reduceFieldsToValues(fields, true)` dari form admin. Field array yang belum
 * punya baris tersimpan sebagai jumlah barisnya (`0`), bukan `[]`, karena state form array memakai
 * `disableFormData`. Field array dan hasMany diubah ke array supaya analisis tidak salah membaca.
 */
export function rapikanIsian(nilai: Record<string, unknown>): IsianArtikel {
  const isian = nilai as IsianArtikel & Record<string, unknown>
  const seo = (isian.seo && typeof isian.seo === 'object' ? isian.seo : {}) as NonNullable<IsianArtikel['seo']>
  return {
    ...isian,
    intinya: daftar(isian.intinya),
    sumber: daftar(isian.sumber),
    seo: { ...seo, keyphraseSekunder: daftar<string>(seo.keyphraseSekunder) },
  }
}

const idRelasi = (r: unknown): number | string | null =>
  r && typeof r === 'object' ? ((r as { id?: number | string }).id ?? null) : typeof r === 'number' || typeof r === 'string' ? r : null

/** Masukan endpoint dari isian form: ID dokumen, pilar, keyphrase, artikel yang sudah ditautkan, media. */
export function masukanPanel(isian: IsianArtikel): MasukanPanel {
  // Hanya tautan ke dokumen (linkType internal) yang punya ID; domain situs tidak berpengaruh di sini.
  const tertaut = tautanIsi(isian.isi, '').flatMap((t) => ('docId' in t && t.relationTo === 'artikel' ? [t.docId] : []))
  const media = [idRelasi(isian.gambarUtama), idRelasi(isian.seo?.gambarOG), ...idGambarIsi(isian.isi)].filter(
    (id): id is number | string => id !== null,
  )
  return {
    id: isian.id ?? null,
    pilar: idRelasi(isian.pilar),
    keyphrase: isian.seo?.keyphrase ?? null,
    keyphraseSekunder: isian.seo?.keyphraseSekunder ?? [],
    tertaut: [...new Set(tertaut)],
    media: [...new Set(media)],
  }
}

const mediaDari = (r: unknown, media: DataPanel['media']): MediaSeo | null => {
  const id = idRelasi(r)
  return id === null ? null : (media[String(id)] ?? { id })
}

export type HasilPanel = {
  cek: Cek[]
  pratinjau: { desktop: TeksPratinjau; hp: TeksPratinjau; sosial: TeksPratinjau }
  gambarOg: GambarOg
  canonical: string
  noindex: boolean
}

/** Checklist dan pratinjau dari isian form ditambah data server. */
export function hasilPanel(isian: IsianArtikel, data: DataPanel): HasilPanel {
  const situs: Situs = data.situs
  const gambarUtama = mediaDari(isian.gambarUtama, data.media)
  const doc: ArtikelSeo = {
    id: isian.id,
    judul: isian.judul ?? '',
    slug: isian.slug,
    tipe: isian.tipe ?? 'panduan',
    deck: isian.deck,
    pilar: data.pilar,
    penulis: null,
    gambarUtama,
    seo: { ...isian.seo, gambarOG: mediaDari(isian.seo?.gambarOG, data.media) },
  }
  const masukan = { jenis: 'artikel' as const, doc }
  const artikel: ArtikelAnalisis = {
    judul: isian.judul,
    slug: isian.slug,
    intinya: isian.intinya,
    isi: isiDenganMedia(isian.isi, data.media),
    sumber: isian.sumber,
    gambarUtama,
    seo: isian.seo,
  }
  const url = isian.slug ? urlAbsolut(situs, pathDokumen(masukan)) : urlAbsolut(situs, '/')
  const teks = { judul: judulSeo(masukan, situs), deskripsi: deskripsiDokumen(masukan, situs), url }
  return {
    cek: analisis(artikel, { urlSitus: situs.urlSitus }),
    pratinjau: {
      desktop: teksPratinjau(teks, 'desktop'),
      hp: teksPratinjau(teks, 'hp'),
      sosial: teksPratinjau(teks, 'sosial'),
    },
    gambarOg: gambarOgDokumen(masukan, situs),
    canonical: canonicalDokumen(masukan, situs),
    noindex: Boolean(isian.seo?.noindex),
  }
}
