/**
 * Modul SEO (spesifikasi §5): antarmuka kecil, fungsi murni.
 *
 * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik (Rencana 4).
 * - `jsonLd(masukan, situs)` untuk `<script type="application/ld+json">`, dirender dengan `serialisasiJsonLd`.
 * - `analisis(artikel, { urlSitus })` untuk checklist panel SEO di editor.
 * - `remahRoti(masukan)` untuk breadcrumb tampil (sama dengan schema BreadcrumbList).
 * - `ambilSitus(payload)` mengisi argumen `situs` dari global `pengaturan-seo`.
 *
 * Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`,
 * `/feed.xml`) ada di `src/app/(frontend)/` dan memakai `rute.ts`. Ekspor ini aman untuk server;
 * komponen admin mengimpor `panel.ts` langsung.
 */
export { metadata, canonicalDokumen, JUDUL_TIDAK_DITEMUKAN, metadataTidakDitemukan, PATH_FEED } from './metadata'
export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
export { analisis, skor, BATAS } from './analisis'
export type { ArtikelAnalisis, Cek, IdCek, StatusCek } from './analisis'
export { entriFeed, entriNews, entriSitemap, lastmodDokumen, layakSitemap } from './sitemap'
export * from './xml'
export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
export { ambilSitus } from './situs'
export type * from './tipe'
