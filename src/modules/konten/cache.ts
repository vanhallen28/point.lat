import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'
import { ambilSitus } from '@/modules/seo/situs'

import {
  ambilArtikel,
  ambilBeranda,
  ambilDaftarVideo,
  ambilFooter,
  ambilGlosarium,
  ambilHalaman,
  ambilHeader,
  ambilPenulis,
  ambilPopuler,
  ambilRubrik,
  ambilTakarir,
  ambilTerbaru,
  ambilTool,
  ambilTools,
  ambilVideo,
  cariArtikel,
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

/** Artikel paling banyak diklik pekan ini (halaman 404). Tag `analitik` dibuang setiap sinkron Search Analytics. */
export const muatPopuler = unstable_cache(async (jumlah: number) => ambilPopuler(await payload(), jumlah), ['konten', 'populer'], {
  tags: [TAG.analitik, TAG.koleksi('artikel'), TAG.koleksi('pilar')],
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

/** Indeks `/video`: kartu memakai pilar (warna) dan media (poster). */
export const muatDaftarVideo = unstable_cache(async () => ambilDaftarVideo(await payload()), ['konten', 'daftar-video'], {
  tags: [TAG.koleksi('video'), TAG.koleksi('pilar'), TAG.media],
  revalidate: SEJAM,
})

/** Halaman video memuat artikel induknya, jadi ikut dibuang saat artikel berubah. */
export const muatVideo = unstable_cache(async (slug: string) => ambilVideo(await payload(), slug), ['konten', 'video'], {
  tags: [TAG.koleksi('video'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
  revalidate: SEJAM,
})

/** Indeks `/tools`: nama, ringkasan, dan pilar (nama, warna, urutan) setiap kalkulator terbit. */
export const muatTools = unstable_cache(async () => ambilTools(await payload()), ['konten', 'tools'], {
  tags: [TAG.koleksi('tools'), TAG.koleksi('pilar')],
  revalidate: SEJAM,
})

/**
 * Halaman kalkulator: penjelasan bisa menautkan dokumen apa pun (tag sama dengan artikel), dan angka
 * aturannya dari koleksi `parameter-tools` (hook koleksi itu membuang tag `parameter-tools`).
 */
export const muatTool = unstable_cache(async (slug: string) => ambilTool(await payload(), slug), ['konten', 'tool'], {
  tags: [...TAG_ARTIKEL, TAG.parameterTools],
  revalidate: SEJAM,
})

/** Hasil `/cari` per kueri (sudah dirapikan `rapikanKueri`), dibuang saat artikel atau pilar berubah. */
export const muatCari = unstable_cache(async (kueri: string) => cariArtikel(await payload(), kueri), ['konten', 'cari'], {
  tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
  revalidate: SEJAM,
})

/**
 * Beranda. Tag `beranda` dibuang saat global beranda atau newsletter disimpan dan saat artikel, pilar,
 * video, atau tools terbit (`tagRevalidasi`); `media` untuk poster video; `analitik` setiap sinkron
 * Search Analytics ("Paling dicari pekan ini"); `iklan` saat global iklan disimpan dan `halaman` saat halaman
 * statis terbit atau batal terbit (blok Slot iklan tampil hanya bila Kebijakan Privasi terbit).
 */
export const muatBeranda = unstable_cache(async () => ambilBeranda(await payload()), ['konten', 'beranda'], {
  tags: [TAG.beranda, TAG.media, TAG.analitik, TAG.iklan, TAG.koleksi('halaman')],
  revalidate: SEJAM,
})

/** Takarir WebVTT per video; dibuang saat video berubah. */
export const muatTakarir = unstable_cache(async (slug: string) => ambilTakarir(await payload(), slug), ['konten', 'takarir'], {
  tags: [TAG.koleksi('video')],
  revalidate: SEJAM,
})
