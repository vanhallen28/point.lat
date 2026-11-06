import type { Pilar, Subkategori } from '@/payload-types'
import { pathFor } from '@/lib/paths'
import { teksIsi, type IsiDokumen } from '@/modules/seo/lexical'
import type { PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'

import { pilarRingkas } from './artikel'
import { susunPaginasi } from './paginasi'
import type { DataRubrik, KartuArtikel } from './tipe'

type SubkategoriRingkas = Pick<Subkategori, 'id' | 'nama' | 'slug'>

/** Intro rubrik hanya tampil bila ada teksnya (editor bisa menyisakan paragraf kosong). */
function introBerisi(intro: IsiDokumen): IsiDokumen {
  return teksIsi(intro).join('').trim() ? intro : null
}

/**
 * Data halaman rubrik pilar (`sub` `null`) atau subkategori. Navigasi berisi "Semua" (pilar) lalu
 * semua subkategori pilar itu, dengan halaman yang sedang dibuka ditandai `aktif`. Intro pilar
 * hanya tampil di halaman 1 pilar. `halaman`: nomor halaman dan jumlah seluruh tulisan rubrik itu.
 * `null` bila pilar belum punya slug atau nomor halaman di luar jangkauan (404).
 */
export function susunRubrik(
  pilar: Pilar,
  sub: Subkategori | null,
  daftarSub: SubkategoriRingkas[],
  artikel: KartuArtikel[],
  halaman: { nomor: number; total: number } = { nomor: 1, total: artikel.length },
): DataRubrik | null {
  const ringkas = pilarRingkas(pilar)
  if (!ringkas) return null
  const href = sub?.slug ? pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: ringkas.slug }) : ringkas.href
  const paginasi = susunPaginasi(href, halaman.nomor, halaman.total)
  if (!paginasi) return null
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
      href,
      deskripsi: sub.deskripsi?.trim() || null,
      intro: null,
      pilar: ringkas,
      subkategori: navigasi,
      artikel,
      paginasi,
      seo: { jenis: 'subkategori', doc, halaman: paginasi.nomor },
    }
  }
  return {
    judul: pilar.nama,
    href,
    deskripsi: pilar.deskripsi?.trim() || null,
    intro: paginasi.nomor === 1 ? introBerisi(pilar.intro as IsiDokumen) : null,
    pilar: ringkas,
    subkategori: navigasi,
    artikel,
    paginasi,
    seo: { jenis: 'pilar', doc: pilar as PilarSeo, halaman: paginasi.nomor },
  }
}
