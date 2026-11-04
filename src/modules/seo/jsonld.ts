import type { ToolId } from '@/lib/konstanta'
import { pathFor } from '@/lib/paths'
import { bangunUrl } from '@/modules/media/url'

import { ambil, deskripsiDokumen, pathDokumen, urlAbsolut } from './dokumen'
import { canonicalDokumen } from './metadata'
import type { ArtikelSeo, MasukanSeo, PenulisSeo, Situs, ToolsSeo, VideoSeo } from './tipe'

/**
 * JSON-LD per halaman (spesifikasi §8): satu `@graph` berisi Organization dan WebSite (selalu),
 * node utama sesuai jenis, dan BreadcrumbList. FAQPage dan HowTo sengaja tidak dibuat karena rich
 * result-nya sudah dihapus Google. Tidak ada rating palsu untuk WebApplication.
 */

export type NodeJsonLd = { '@type': string; '@id'?: string } & Record<string, unknown>
export type JsonLd = { '@context': 'https://schema.org'; '@graph': NodeJsonLd[] }

export type RemahRoti = { nama: string; path: string }

const BAHASA = 'id-ID'

const idOrganisasi = (situs: Situs) => urlAbsolut(situs, '/#organisasi')
const idSitus = (situs: Situs) => urlAbsolut(situs, '/#situs')
const idPenulis = (situs: Situs, slug: string) => `${urlAbsolut(situs, pathFor({ jenis: 'penulis', slug }))}#orang`

/** Kategori Google untuk WebApplication per kalkulator. */
const KATEGORI_TOOL: Record<ToolId, string> = {
  'gaji-bersih': 'FinanceApplication',
  thr: 'FinanceApplication',
  'cicilan-kpr': 'FinanceApplication',
  'dana-darurat': 'FinanceApplication',
  'bmi-kalori': 'HealthApplication',
  ipk: 'EducationalApplication',
}

/** Durasi ISO 8601 (`PT1M5S`) dari detik. */
export function durasiIso(detik: number): string {
  const total = Math.max(0, Math.round(detik))
  const menit = Math.floor(total / 60)
  const sisa = total % 60
  return `PT${menit ? `${menit}M` : ''}${sisa || !menit ? `${sisa}S` : ''}`
}

/**
 * Remah roti dari beranda sampai dokumen. Dipakai untuk schema BreadcrumbList dan untuk tampilan
 * di halaman (Rencana 4), jadi keduanya selalu sama.
 */
export function remahRoti(masukan: MasukanSeo): RemahRoti[] {
  const beranda: RemahRoti = { nama: 'Beranda', path: '/' }
  switch (masukan.jenis) {
    case 'beranda':
      return []
    case 'statis':
      return [beranda, { nama: masukan.judul, path: masukan.path }]
    case 'artikel': {
      const { doc } = masukan
      const sendiri = { nama: doc.judul, path: pathDokumen(masukan) }
      if (doc.tipe === 'glosarium') return [beranda, { nama: 'Glosarium', path: '/glosarium' }, sendiri]
      const pilar = ambil(doc.pilar)
      const sub = ambil(doc.subkategori)
      const hasil = [beranda]
      if (pilar?.slug) hasil.push({ nama: pilar.nama, path: pathFor({ jenis: 'pilar', slug: pilar.slug }) })
      if (pilar?.slug && sub?.slug) {
        hasil.push({ nama: sub.nama, path: pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: pilar.slug }) })
      }
      return [...hasil, sendiri]
    }
    case 'subkategori': {
      const pilar = ambil(masukan.doc.pilar)
      const atas = pilar?.slug ? [{ nama: pilar.nama, path: pathFor({ jenis: 'pilar', slug: pilar.slug }) }] : []
      return [beranda, ...atas, { nama: masukan.doc.nama, path: pathDokumen(masukan) }]
    }
    case 'tools':
      return [beranda, { nama: 'Tools', path: '/tools' }, { nama: masukan.doc.nama, path: pathDokumen(masukan) }]
    case 'video':
      return [beranda, { nama: 'Video', path: '/video' }, { nama: masukan.doc.judul, path: pathDokumen(masukan) }]
    case 'pilar':
    case 'penulis':
      return [beranda, { nama: masukan.doc.nama, path: pathDokumen(masukan) }]
    case 'halaman':
      return [beranda, { nama: masukan.doc.judul, path: pathDokumen(masukan) }]
  }
}

function organisasi(situs: Situs): NodeJsonLd {
  const logo = ambil(situs.organisasi?.logo ?? null)
  const sameAs = situs.organisasi?.sameAs?.filter(Boolean) ?? []
  return {
    '@type': 'Organization',
    '@id': idOrganisasi(situs),
    name: situs.organisasi?.nama || situs.namaSitus,
    url: urlAbsolut(situs, '/'),
    ...(logo?.publicId
      ? {
          logo: {
            '@type': 'ImageObject',
            url: bangunUrl(situs.cloudName, logo.publicId),
            ...(logo.width ? { width: logo.width } : {}),
            ...(logo.height ? { height: logo.height } : {}),
          },
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

function situsWeb(situs: Situs): NodeJsonLd {
  return {
    '@type': 'WebSite',
    '@id': idSitus(situs),
    url: urlAbsolut(situs, '/'),
    name: situs.namaSitus,
    ...(situs.organisasi?.nama && situs.organisasi.nama !== situs.namaSitus ? { alternateName: situs.organisasi.nama } : {}),
    inLanguage: BAHASA,
    publisher: { '@id': idOrganisasi(situs) },
  }
}

function orang(penulis: PenulisSeo, situs: Situs): NodeJsonLd {
  const foto = ambil(penulis.foto ?? null)
  const sameAs = penulis.tautan?.map((t) => t.url).filter(Boolean) ?? []
  return {
    '@type': 'Person',
    '@id': idPenulis(situs, penulis.slug ?? ''),
    name: penulis.nama,
    url: urlAbsolut(situs, pathFor({ jenis: 'penulis', slug: penulis.slug ?? '' })),
    ...(penulis.bio ? { description: penulis.bio } : {}),
    ...(foto?.publicId ? { image: bangunUrl(situs.cloudName, foto.publicId, 'thumbnail', { lebar: 400 }) } : {}),
    ...(penulis.keahlian?.length ? { knowsAbout: penulis.keahlian } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    worksFor: { '@id': idOrganisasi(situs) },
  }
}

/** Explainer otomatis menjadi NewsArticle; tipe lain Article. Editor bisa memaksa lewat `tipeSchema`. */
export function tipeSchemaArtikel(doc: Pick<ArtikelSeo, 'tipe' | 'seo'>): 'Article' | 'NewsArticle' {
  const pilihan = doc.seo?.tipeSchema
  if (pilihan === 'Article' || pilihan === 'NewsArticle') return pilihan
  return doc.tipe === 'explainer' ? 'NewsArticle' : 'Article'
}

function nodeArtikel(doc: ArtikelSeo, masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
  const url = canonicalDokumen(masukan, situs)
  const gambar = ambil(doc.gambarUtama ?? null)
  const penulis = ambil(doc.penulis)
  const pilar = ambil(doc.pilar)
  const terbit = doc.terbitPada ?? undefined
  const artikel: NodeJsonLd = {
    '@type': tipeSchemaArtikel(doc),
    '@id': `${url}#artikel`,
    headline: doc.judul,
    description: deskripsiDokumen(masukan, situs),
    url,
    mainEntityOfPage: url,
    inLanguage: BAHASA,
    ...(gambar?.publicId
      ? {
          // Google meminta beberapa rasio (16x9, 4x3, 1x1) dengan resolusi tinggi.
          image: (['hero', 'kartu', 'thumbnail'] as const).map((preset) =>
            bangunUrl(situs.cloudName, gambar.publicId as string, preset, { lebar: 1200 }),
          ),
        }
      : {}),
    ...(terbit ? { datePublished: terbit, dateModified: doc.diperbaruiBesar ?? terbit } : {}),
    ...(penulis?.slug
      ? {
          author: [
            {
              '@type': 'Person',
              '@id': idPenulis(situs, penulis.slug),
              name: penulis.nama,
              url: urlAbsolut(situs, pathFor({ jenis: 'penulis', slug: penulis.slug })),
            },
          ],
        }
      : {}),
    publisher: { '@id': idOrganisasi(situs) },
    isPartOf: { '@id': idSitus(situs) },
    ...(pilar?.nama ? { articleSection: pilar.nama } : {}),
  }
  return [artikel]
}

function nodeTools(doc: ToolsSeo, masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
  return [
    {
      '@type': 'WebApplication',
      '@id': `${canonicalDokumen(masukan, situs)}#aplikasi`,
      name: doc.nama,
      url: canonicalDokumen(masukan, situs),
      description: deskripsiDokumen(masukan, situs),
      applicationCategory: KATEGORI_TOOL[doc.toolId],
      operatingSystem: 'Semua',
      browserRequirements: 'Membutuhkan JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0 },
      inLanguage: BAHASA,
      publisher: { '@id': idOrganisasi(situs) },
    },
  ]
}

function nodeVideo(doc: VideoSeo, masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
  const file = ambil(doc.file ?? null)
  const poster = ambil(doc.poster ?? null)
  const durasi = doc.durasiDetik ?? file?.durasi
  const thumbnail = poster?.publicId
    ? bangunUrl(situs.cloudName, poster.publicId, 'og')
    : file?.publicId
      ? bangunUrl(situs.cloudName, file.publicId, 'poster')
      : undefined
  return [
    {
      '@type': 'VideoObject',
      '@id': `${canonicalDokumen(masukan, situs)}#video`,
      name: doc.judul,
      description: deskripsiDokumen(masukan, situs),
      ...(thumbnail ? { thumbnailUrl: [thumbnail] } : {}),
      // Koleksi video tidak punya tanggal terbit sendiri: tanggal dokumen dibuat dipakai sebagai tanggal unggah.
      ...(doc.createdAt ? { uploadDate: doc.createdAt } : {}),
      ...(durasi ? { duration: durasiIso(durasi) } : {}),
      ...(file?.publicId ? { contentUrl: bangunUrl(situs.cloudName, file.publicId, 'mp4') } : {}),
      ...(doc.transkrip ? { transcript: doc.transkrip } : {}),
      inLanguage: BAHASA,
      publisher: { '@id': idOrganisasi(situs) },
    },
  ]
}

function nodeRemahRoti(masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
  const remah = remahRoti(masukan)
  if (remah.length < 2) return []
  return [
    {
      '@type': 'BreadcrumbList',
      '@id': `${urlAbsolut(situs, pathDokumen(masukan))}#remah`,
      itemListElement: remah.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.nama,
        item: urlAbsolut(situs, r.path),
      })),
    },
  ]
}

/** JSON-LD satu halaman. Hasilnya dirender Rencana 4 lewat `serialisasiJsonLd` di `<script type="application/ld+json">`. */
export function jsonLd(masukan: MasukanSeo, situs: Situs): JsonLd {
  const utama: NodeJsonLd[] = (() => {
    switch (masukan.jenis) {
      case 'artikel':
        return nodeArtikel(masukan.doc, masukan, situs)
      case 'tools':
        return nodeTools(masukan.doc, masukan, situs)
      case 'video':
        return nodeVideo(masukan.doc, masukan, situs)
      case 'penulis': {
        const url = canonicalDokumen(masukan, situs)
        return [{ '@type': 'ProfilePage', '@id': url, url, inLanguage: BAHASA, mainEntity: orang(masukan.doc, situs) }]
      }
      default:
        return []
    }
  })()
  return {
    '@context': 'https://schema.org',
    '@graph': [organisasi(situs), situsWeb(situs), ...utama, ...nodeRemahRoti(masukan, situs)],
  }
}

/** JSON aman untuk `<script>`: `<` di-escape supaya isi dokumen tidak bisa menutup tag skrip. */
export function serialisasiJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
