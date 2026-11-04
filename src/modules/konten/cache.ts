import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'
import { ambilSitus } from '@/modules/seo/situs'

import {
  ambilArtikel,
  ambilFooter,
  ambilGlosarium,
  ambilHalaman,
  ambilHeader,
  ambilPenulis,
  ambilRubrik,
  ambilTerbaru,
  cariRedirect,
} from './data'

/**
 * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
 * saat pertama diminta (ISR) dan tag cache data ikut tercatat di halaman itu, jadi `revalidateTag`
 * dari hook Payload membuang data dan halamannya sekaligus. `revalidate: 3600` adalah jaring pengaman
 * bila ada perubahan yang tidak memicu hook (sama dengan rute teknis Rencana 3).
 */
const SEJAM = 3600

const payload = () => getPayload({ config })

/** Menu header memakai nama, slug, dan warna pilar, jadi ikut dibuang saat pilar mana pun berubah. */
export const muatHeader = unstable_cache(async () => ambilHeader(await payload()), ['konten', 'header'], {
  tags: [TAG.header, TAG.koleksi('pilar')],
  revalidate: SEJAM,
})

export const muatFooter = unstable_cache(async () => ambilFooter(await payload()), ['konten', 'footer'], {
  tags: [TAG.footer],
  revalidate: SEJAM,
})

/** Pengaturan SEO + cloud name untuk `metadata()`, `jsonLd()`, dan URL gambar. */
export const muatSitus = unstable_cache(async () => ambilSitus(await payload()), ['konten', 'situs'], {
  tags: [TAG.pengaturanSeo, TAG.media],
  revalidate: SEJAM,
})

/**
 * Halaman artikel bergantung pada banyak dokumen: pilar, subkategori, penulis, media, artikel
 * terkait, tools dan video yang disematkan, serta dokumen yang ditautkan di isi. Karena itu dipakai
 * tag koleksi, bukan tag per dokumen: perubahan di koleksi itu membuang cache semua halaman artikel
 * (dirender ulang saat diminta berikutnya), sehingga tidak ada halaman yang basi. Tag `artikel` juga
 * membuang halaman 404 yang tersimpan saat artikel dengan slug itu terbit.
 */
export const TAG_ARTIKEL = [
  TAG.koleksi('artikel'),
  TAG.koleksi('pilar'),
  TAG.koleksi('subkategori'),
  TAG.koleksi('penulis'),
  TAG.koleksi('tools'),
  TAG.koleksi('video'),
  TAG.koleksi('halaman'),
  TAG.media,
]

export const muatArtikel = unstable_cache(
  async (slug: string, glosarium: boolean) => ambilArtikel(await payload(), slug, { glosarium }),
  ['konten', 'artikel'],
  { tags: TAG_ARTIKEL, revalidate: SEJAM },
)

/** Indeks glosarium hanya berisi artikel bertipe glosarium. */
export const muatGlosarium = unstable_cache(async () => ambilGlosarium(await payload()), ['konten', 'glosarium'], {
  tags: [TAG.koleksi('artikel')],
  revalidate: SEJAM,
})

/** Redirect per path. Hook koleksi `redirect` membuang cache ini beserta halaman yang memakainya. */
export const muatRedirect = unstable_cache(async (path: string) => cariRedirect(await payload(), path), ['konten', 'redirect'], {
  tags: [TAG.redirect],
  revalidate: SEJAM,
})

/** Kartu tulisan terbaru di halaman 404. */
export const muatTerbaru = unstable_cache(async (jumlah: number) => ambilTerbaru(await payload(), jumlah), ['konten', 'terbaru'], {
  tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
  revalidate: SEJAM,
})

/**
 * Halaman rubrik pilar dan subkategori. Intro pilar bisa menautkan dokumen apa pun, jadi tagnya sama
 * dengan halaman artikel.
 */
export const muatRubrik = unstable_cache(
  async (pilarSlug: string, subSlug: string | null) => ambilRubrik(await payload(), pilarSlug, subSlug),
  ['konten', 'rubrik'],
  { tags: TAG_ARTIKEL, revalidate: SEJAM },
)

/** Halaman statis: blok teks, CTA, dan tool bisa menautkan dokumen apa pun, jadi tagnya sama dengan artikel. */
export const muatHalaman = unstable_cache(async (slug: string) => ambilHalaman(await payload(), slug), ['konten', 'halaman'], {
  tags: TAG_ARTIKEL,
  revalidate: SEJAM,
})

/** Profil penulis: foto (media), kartu tulisan (artikel dan pilar), dan data penulis sendiri. */
export const muatPenulis = unstable_cache(async (slug: string) => ambilPenulis(await payload(), slug), ['konten', 'penulis'], {
  tags: [TAG.koleksi('penulis'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
  revalidate: SEJAM,
})
