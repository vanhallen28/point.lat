import type { Pilar, Subkategori } from '@/payload-types'
import { pathFor } from '@/lib/paths'
import { teksIsi, type IsiDokumen } from '@/modules/seo/lexical'
import type { PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'

import { pilarRingkas } from './artikel'
import type { DataRubrik, KartuArtikel } from './tipe'

/** Jumlah tulisan terbaru di halaman rubrik. Paginasi menyusul bila satu pilar melewati angka ini. */
export const MAKS_ARTIKEL_RUBRIK = 24

type SubkategoriRingkas = Pick<Subkategori, 'id' | 'nama' | 'slug'>

/** Intro rubrik hanya tampil bila ada teksnya (editor bisa menyisakan paragraf kosong). */
function introBerisi(intro: IsiDokumen): IsiDokumen {
  return teksIsi(intro).join('').trim() ? intro : null
}

/**
 * Data halaman rubrik pilar (`sub` `null`) atau subkategori. Navigasi berisi "Semua" (pilar) lalu
 * semua subkategori pilar itu, dengan halaman yang sedang dibuka ditandai `aktif`. Intro pilar
 * hanya tampil di halaman pilar. `null` bila pilar belum punya slug.
 */
export function susunRubrik(
  pilar: Pilar,
  sub: Subkategori | null,
  daftarSub: SubkategoriRingkas[],
  artikel: KartuArtikel[],
): DataRubrik | null {
  const ringkas = pilarRingkas(pilar)
  if (!ringkas) return null
  const subkategori = daftarSub
    .filter((s) => s.slug)
    .map((s) => ({
      label: s.nama,
      href: pathFor({ jenis: 'subkategori', slug: s.slug as string, pilarSlug: ringkas.slug }),
      aktif: s.id === sub?.id,
    }))
  const navigasi = subkategori.length > 0 ? [{ label: 'Semua', href: ringkas.href, aktif: !sub }, ...subkategori] : []
  if (sub?.slug) {
    const doc = { ...sub, pilar } as SubkategoriSeo
    return {
      judul: sub.nama,
      href: pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: ringkas.slug }),
      deskripsi: sub.deskripsi?.trim() || null,
      intro: null,
      pilar: ringkas,
      subkategori: navigasi,
      artikel,
      seo: { jenis: 'subkategori', doc },
    }
  }
  return {
    judul: pilar.nama,
    href: ringkas.href,
    deskripsi: pilar.deskripsi?.trim() || null,
    intro: introBerisi(pilar.intro as IsiDokumen),
    pilar: ringkas,
    subkategori: navigasi,
    artikel,
    seo: { jenis: 'pilar', doc: pilar as PilarSeo },
  }
}
