/**
 * Modul SEO (spesifikasi §5): antarmuka kecil, fungsi murni.
 * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik.
 * - `jsonLd(masukan, situs)` untuk `<script type="application/ld+json">` (pakai `serialisasiJsonLd`).
 * - `analisis(artikel, { urlSitus })` untuk checklist panel SEO di editor.
 * - Pembentuk sitemap, news sitemap, robots.txt, dan RSS untuk rute teknis.
 */
export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
export { analisis, skor, BATAS } from './analisis'
export type { ArtikelAnalisis, Cek, IdCek, StatusCek } from './analisis'
export { entriFeed, entriNews, entriSitemap, lastmodDokumen, layakSitemap } from './sitemap'
export * from './xml'
export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
export type * from './tipe'
