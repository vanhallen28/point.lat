import { ambil, deskripsiDokumen, pathDokumen, urlAbsolut } from './dokumen'
import { canonicalDokumen } from './metadata'
import type { ArtikelSeo, MasukanSeo, PengaturanSitus } from './tipe'
import type { EntriFeed, EntriNews, EntriSitemap } from './xml'

type SitusUrl = Pick<PengaturanSitus, 'urlSitus'>

/**
 * `lastmod` sitemap. Artikel: `diperbaruiBesar ?? terbitPada`, jadi hanya berubah saat perubahan
 * besar (spesifikasi §8). Koleksi lain tidak punya tanggal itu: dipakai `updatedAt`.
 */
export function lastmodDokumen(masukan: MasukanSeo): string | null {
  if (masukan.jenis === 'beranda' || masukan.jenis === 'statis') return null
  if (masukan.jenis === 'artikel') return masukan.doc.diperbaruiBesar ?? masukan.doc.terbitPada ?? null
  return masukan.doc.updatedAt ?? null
}

/**
 * Dokumen masuk sitemap bila punya slug, tidak noindex, dan canonical-nya menunjuk dirinya sendiri.
 * Status terbit disaring di query (`_status: published`).
 */
export function layakSitemap(masukan: MasukanSeo, situs: SitusUrl): boolean {
  if (masukan.jenis === 'beranda' || masukan.jenis === 'statis') return true
  if (!masukan.doc.slug || masukan.doc.seo?.noindex) return false
  if (masukan.jenis === 'subkategori' && !ambil(masukan.doc.pilar)?.slug) return false
  const sendiri = urlAbsolut(situs, pathDokumen(masukan))
  return canonicalDokumen(masukan, situs) === sendiri
}

export function entriSitemap(masukan: MasukanSeo[], situs: SitusUrl): EntriSitemap[] {
  return masukan
    .filter((m) => layakSitemap(m, situs))
    .map((m) => ({ loc: urlAbsolut(situs, pathDokumen(m)), lastmod: lastmodDokumen(m) }))
}

const artikelTerbit = (docs: ArtikelSeo[], situs: SitusUrl) =>
  docs.filter((doc) => doc.terbitPada && layakSitemap({ jenis: 'artikel', doc }, situs))

export function entriNews(docs: ArtikelSeo[], situs: SitusUrl): EntriNews[] {
  return artikelTerbit(docs, situs).map((doc) => ({
    loc: urlAbsolut(situs, pathDokumen({ jenis: 'artikel', doc })),
    judul: doc.judul,
    terbitPada: doc.terbitPada as string,
  }))
}

export function entriFeed(docs: ArtikelSeo[], situs: PengaturanSitus): EntriFeed[] {
  return artikelTerbit(docs, situs).map((doc) => ({
    judul: doc.judul,
    link: urlAbsolut(situs, pathDokumen({ jenis: 'artikel', doc })),
    deskripsi: deskripsiDokumen({ jenis: 'artikel', doc }, situs),
    terbitPada: doc.terbitPada as string,
    penulis: ambil(doc.penulis)?.nama ?? null,
    kategori: ambil(doc.pilar)?.nama ?? null,
  }))
}
