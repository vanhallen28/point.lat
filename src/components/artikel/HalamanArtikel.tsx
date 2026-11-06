import Image from 'next/image'

import { ChipPilar } from '@/components/dasar/ChipPilar'
import { Ikon } from '@/components/dasar/Ikon'
import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { SlotIklan } from '@/components/iklan/SlotIklan'
import { Tautan } from '@/components/dasar/Tautan'
import { Keterangan, UKURAN_KOLOM_ISI } from '@/components/isi/GambarIsi'
import { IsiArtikel } from '@/components/isi/IsiArtikel'
import { DaftarKartu } from '@/components/kartu/KartuArtikel'
import { JudulBersama } from '@/components/motion/JudulBersama'
import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
import { pilihSlot, sisipkanIklanTengah } from '@/modules/iklan/aturan'
import type { PengaturanIklan } from '@/modules/iklan/tipe'
import { tanggalIndonesia } from '@/modules/konten/artikel'
import type { DataArtikel } from '@/modules/konten/tipe'
import { propsGambar } from '@/modules/media/props'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { Situs } from '@/modules/seo/tipe'

import gaya from './Artikel.module.css'
import { BlokSumber } from './BlokSumber'
import { Catatan } from './Catatan'
import { DaftarIsi } from './DaftarIsi'
import { Faq } from './Faq'
import { KotakIntinya } from './KotakIntinya'
import { ProfilPenulis } from './ProfilPenulis'

/**
 * Halaman artikel (keempat tipe, termasuk glosarium) dengan urutan dari spesifikasi §4: kicker
 * pilar, H1, deck, byline, kotak Intinya, daftar isi, isi, sumber, FAQ, artikel terkait, profil
 * penulis. Breadcrumb dan JSON-LD dibangun modul SEO dari dokumen yang sama.
 *
 * Iklan (spesifikasi §11) hanya di dua tempat: di tengah isi setelah paragraf ke-N (`sisipkanIklanTengah`)
 * dan setelah isi, sebelum catatan, sumber, dan FAQ. Tidak pernah di atas H1 atau di dalam kotak Intinya.
 */
export function HalamanArtikel({ artikel, situs, iklan = null }: { artikel: DataArtikel; situs: Situs; iklan?: PengaturanIklan | null }) {
  const masukan = { jenis: 'artikel', doc: artikel.seo } as const
  const gambar = propsGambar(artikel.gambar, 'hero', { cloudName: situs.cloudName, lebar: 1440 })
  return (
    <article className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <p className={gaya.kicker}>
          {artikel.pilar && <ChipPilar pilar={artikel.pilar} />}
          <span>{LABEL_TIPE_ARTIKEL[artikel.tipe]}</span>
        </p>
        <JudulBersama id={artikel.id}>
          <h1 className={gaya.judul}>{artikel.judul}</h1>
        </JudulBersama>
        <p className={gaya.deck}>{artikel.deck}</p>
        <p className={gaya.byline}>
          {artikel.penulis && (
            <span>
              Oleh <Tautan href={artikel.penulis.href}>{artikel.penulis.nama}</Tautan>
            </span>
          )}
          {artikel.diperbarui && (
            <span>
              <Ikon nama="calendar" ukuran={18} />
              Diperbarui <time dateTime={artikel.diperbarui}>{tanggalIndonesia(artikel.diperbarui)}</time>
            </span>
          )}
          <span>
            <Ikon nama="clock" ukuran={18} />
            {artikel.waktuBaca} menit baca
          </span>
        </p>
      </header>

      <div className={gaya.badan}>
        <KotakIntinya poin={artikel.intinya} warna={artikel.pilar?.warna ?? null} />
        {artikel.daftarIsi.length > 0 && (
          <div className={gaya.samping}>
            <DaftarIsi subjudul={artikel.daftarIsi} />
          </div>
        )}
        <div className={gaya.utama}>
          {gambar && artikel.gambar && (
            <figure className={gaya.gambar}>
              <Image {...gambar} alt={gambar.alt} sizes={UKURAN_KOLOM_ISI} fetchPriority="high" loading="eager" />
              <Keterangan media={artikel.gambar} />
            </figure>
          )}
          <IsiArtikel isi={sisipkanIklanTengah(artikel.isi, pilihSlot(iklan, 'artikel-tengah'))} cloudName={situs.cloudName} />
          <SlotIklan slot={pilihSlot(iklan, 'artikel-akhir')} />
          <Catatan teks={artikel.pilar?.disclaimer ?? null} />
          <BlokSumber sumber={artikel.sumber} />
          <Faq faq={artikel.faq} />
        </div>
      </div>

      {artikel.terkait.length > 0 && (
        <section aria-labelledby="terkait" className={gaya.terkait}>
          <h2 id="terkait" className={gaya.subjudul}>
            Baca juga
          </h2>
          <DaftarKartu kartu={artikel.terkait} />
        </section>
      )}
      <ProfilPenulis penulis={artikel.penulis} cloudName={situs.cloudName} />
    </article>
  )
}
