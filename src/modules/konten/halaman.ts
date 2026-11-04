import type { Halaman } from '@/payload-types'
import { pathFor } from '@/lib/paths'
import type { IsiDokumen } from '@/modules/seo/lexical'
import type { HalamanSeo } from '@/modules/seo/tipe'

import { mediaTampil, tandaiSubjudul } from './artikel'
import { hrefDokumen } from './isi'
import type { BlokTampil, DataHalaman } from './tipe'

/** Judul blok FAQ bila editor tidak mengisinya (sama dengan FAQ artikel). */
export const JUDUL_FAQ = 'Pertanyaan yang sering muncul'

type Blok = NonNullable<Halaman['tataLetak']>[number]

const teks = (nilai: string | null | undefined) => nilai?.trim() || null

function susunBlok(blok: Blok, i: number, utama: boolean): BlokTampil | null {
  const id = blok.id ?? `blok-${i}`
  switch (blok.blockType) {
    case 'hero':
      return { jenis: 'hero', id, judul: blok.judul, subjudul: teks(blok.subjudul), gambar: mediaTampil(blok.gambar), utama }
    case 'teks':
      return { jenis: 'teks', id, isi: tandaiSubjudul(blok.isi as IsiDokumen).isi }
    case 'kartu':
      return {
        jenis: 'kartu',
        id,
        judul: teks(blok.judul),
        kartu: blok.kartu.map((k) => ({ judul: k.judul, teks: teks(k.teks), href: teks(k.tautan) })),
      }
    case 'cta':
      return { jenis: 'cta', id, judul: blok.judul, teks: teks(blok.teks), label: blok.labelTombol, href: blok.tautan.trim() }
    case 'faqBlok': {
      const faq = (blok.faq ?? []).map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban }))
      return faq.length ? { jenis: 'faq', id, judul: teks(blok.judul) ?? JUDUL_FAQ, faq } : null
    }
    case 'embedTool': {
      const href = hrefDokumen('tools', blok.tool)
      if (!href || typeof blok.tool !== 'object') return null
      return { jenis: 'tool', id, nama: blok.tool.nama, ringkasan: blok.tool.ringkasan, href }
    }
  }
}

/**
 * Halaman statis (page builder) terbit menjadi data render. Hero pertama yang menjadi blok paling
 * atas memegang H1 halaman (`heroUtama`); bila tidak ada, halaman menampilkan judulnya sebagai H1.
 * Hero lain menjadi H2, supaya halaman selalu punya tepat satu H1. FAQ kosong dan tool yang belum
 * terbit tidak dirender.
 */
export function susunHalaman(doc: Halaman): DataHalaman {
  const tataLetak = doc.tataLetak ?? []
  const heroUtama = tataLetak[0]?.blockType === 'hero'
  return {
    judul: doc.judul,
    href: pathFor({ jenis: 'halaman', slug: doc.slug ?? '' }),
    heroUtama,
    blok: tataLetak.map((b, i) => susunBlok(b, i, heroUtama && i === 0)).filter((b): b is BlokTampil => b !== null),
    seo: doc as HalamanSeo,
  }
}
