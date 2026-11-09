import Image from 'next/image'

import { Ikon } from '@/components/dasar/Ikon'
import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { Tautan } from '@/components/dasar/Tautan'
import { Faq } from '@/components/artikel/Faq'
import { UKURAN_KOLOM_ISI } from '@/components/isi/GambarIsi'
import { IsiArtikel } from '@/components/isi/IsiArtikel'
import { TautanTool } from '@/components/isi/KartuTool'
import { FormKontak } from '@/components/pembaca/FormKontak'
import type { BlokTampil, DataHalaman } from '@/modules/konten/tipe'
import { propsGambar } from '@/modules/media/props'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { Situs } from '@/modules/seo/tipe'

import gaya from './Halaman.module.css'

function Hero({ blok, cloudName }: { blok: Extract<BlokTampil, { jenis: 'hero' }>; cloudName: string }) {
  const Judul = blok.utama ? 'h1' : 'h2'
  const gambar = propsGambar(blok.gambar, 'hero', { cloudName, lebar: 1440 })
  return (
    <div className={gaya.hero}>
      <Judul className={blok.utama ? gaya.judul : gaya.subjudul}>{blok.judul}</Judul>
      {blok.subjudul && <p className={gaya.deck}>{blok.subjudul}</p>}
      {gambar && (
        <Image
          {...gambar}
          alt={gambar.alt}
          sizes={UKURAN_KOLOM_ISI}
          className={gaya.gambar}
          {...(blok.utama ? { fetchPriority: 'high' as const, loading: 'eager' as const } : {})}
        />
      )}
    </div>
  )
}

function Blok({ blok, cloudName, formKontak, asal }: { blok: BlokTampil; cloudName: string; formKontak: boolean; asal: string }) {
  switch (blok.jenis) {
    case 'hero':
      return <Hero blok={blok} cloudName={cloudName} />
    case 'teks':
      return <IsiArtikel isi={blok.isi} cloudName={cloudName} />
    case 'kartu': {
      const daftar = (
        <ul className={gaya.kartu}>
          {blok.kartu.map((k, i) => (
            <li key={i}>
              <h3 className={gaya.kartuJudul}>{k.href ? <Tautan href={k.href}>{k.judul}</Tautan> : k.judul}</h3>
              {k.teks && <p>{k.teks}</p>}
            </li>
          ))}
        </ul>
      )
      if (!blok.judul) return daftar
      return (
        <section aria-labelledby={`${blok.id}-judul`} className={gaya.bagian}>
          <h2 id={`${blok.id}-judul`} className={gaya.subjudul}>
            {blok.judul}
          </h2>
          {daftar}
        </section>
      )
    }
    case 'cta':
      return (
        <section aria-labelledby={`${blok.id}-judul`} className={gaya.cta}>
          <h2 id={`${blok.id}-judul`} className={gaya.subjudul}>
            {blok.judul}
          </h2>
          {blok.teks && <p>{blok.teks}</p>}
          <Tautan href={blok.href} className={gaya.tombol}>
            {blok.label}
            <Ikon nama="arrow-right" />
          </Tautan>
        </section>
      )
    case 'faq':
      return <Faq faq={blok.faq} judul={blok.judul} id={`${blok.id}-faq`} />
    case 'tool':
      return <TautanTool nama={blok.nama} ringkasan={blok.ringkasan} href={blok.href} />
    case 'formKontak':
      // Hanya bila saklar Form kontak di Pengaturan, Fitur menyala (spesifikasi §23).
      return formKontak ? <FormKontak id={blok.id} judul={blok.judul} pengantar={blok.pengantar} asal={asal} /> : null
  }
}

/**
 * Halaman statis dari koleksi `halaman` (Tentang, Kebijakan Redaksi, Pedoman Media Siber, dan
 * seterusnya): blok page builder dirender berurutan. Bila blok pertama bukan hero, judul halaman
 * menjadi H1 di atas blok.
 */
export function HalamanStatis({ halaman, situs, formKontak = false }: { halaman: DataHalaman; situs: Situs; formKontak?: boolean }) {
  const masukan = { jenis: 'halaman', doc: halaman.seo } as const
  return (
    <article className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <RemahRoti remah={remahRoti(masukan)} />
      {!halaman.heroUtama && <h1 className={gaya.judul}>{halaman.judul}</h1>}
      {halaman.blok.map((b) => (
        <Blok key={b.id} blok={b} cloudName={situs.cloudName} formKontak={formKontak} asal={halaman.href} />
      ))}
    </article>
  )
}
