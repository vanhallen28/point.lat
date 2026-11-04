import type { Artikel } from '@/payload-types'
import { pathFor } from '@/lib/paths'

import type { Istilah, KelompokIstilah } from './tipe'

type DokumenIstilah = Pick<Artikel, 'judul' | 'slug' | 'deck' | 'intinya'>

/** Huruf awal tanpa diakritik; selain A-Z masuk kelompok "#" di akhir. */
function hurufAwal(judul: string): string {
  const huruf = judul.normalize('NFD').trim().charAt(0).toUpperCase()
  return /^[A-Z]$/.test(huruf) ? huruf : '#'
}

/**
 * Indeks glosarium: istilah diurutkan abjad (aturan bahasa Indonesia, tanpa beda huruf besar) dan
 * dikelompokkan per huruf awal. Definisi = poin Intinya pertama (kalimat definisi), cadangannya deck.
 */
export function kelompokkanIstilah(docs: DokumenIstilah[]): KelompokIstilah[] {
  const istilah: Istilah[] = docs
    .filter((d) => d.slug)
    .map((d) => ({
      judul: d.judul,
      href: pathFor({ jenis: 'artikel', slug: d.slug as string, tipe: 'glosarium' }),
      definisi: d.intinya?.[0]?.poin ?? d.deck,
    }))
    .sort((a, b) => a.judul.localeCompare(b.judul, 'id', { sensitivity: 'base' }))
  const kelompok = new Map<string, Istilah[]>()
  for (const i of istilah) {
    const huruf = hurufAwal(i.judul)
    kelompok.set(huruf, [...(kelompok.get(huruf) ?? []), i])
  }
  return [...kelompok.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([huruf, daftar]) => ({ huruf, id: huruf === '#' ? 'huruf-lain' : `huruf-${huruf.toLowerCase()}`, istilah: daftar }))
}
