import { ChipPilar } from '@/components/dasar/ChipPilar'
import { Ikon } from '@/components/dasar/Ikon'
import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { BlokSumber } from '@/components/artikel/BlokSumber'
import { Catatan } from '@/components/artikel/Catatan'
import { Faq } from '@/components/artikel/Faq'
import { IsiArtikel } from '@/components/isi/IsiArtikel'
import type { Hasil, Kalkulator as DataKalkulator } from '@/modules/hitung'
import { tanggalIndonesia } from '@/modules/konten/artikel'
import type { DataTool } from '@/modules/konten/tipe'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { Situs } from '@/modules/seo/tipe'

import { AturanTool } from './AturanTool'
import { Kalkulator } from './Kalkulator'
import gaya from './Tool.module.css'

/** Id form kalkulator; satu kalkulator per halaman. */
export const ID_KALKULATOR = 'kalkulator'

/**
 * Halaman `/tools/{slug}` (spesifikasi §4): kalkulator di atas lipatan dengan hasil besar, lalu artikel
 * penjelasan rumus, angka aturan yang dipakai, catatan pilar, sumber aturan, dan FAQ. JSON-LD
 * WebApplication dari modul SEO. Kalkulator menghitung di browser; tanpa JavaScript, form dan hasil
 * contoh dari server tetap tampil.
 */
export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataTool; kalkulator: DataKalkulator; contoh: Hasil | null; situs: Situs }) {
  const masukan = { jenis: 'tools', doc: tool.seo } as const
  const pesan = kalkulator.pesan ?? (contoh && !contoh.ok ? contoh.pesan : null)
  return (
    <article className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <p className={gaya.kicker}>
          {tool.pilar && <ChipPilar pilar={tool.pilar} />}
          <span>Kalkulator</span>
        </p>
        <h1 className={gaya.judul}>Kalkulator {tool.nama}</h1>
        <p className={gaya.deck}>{tool.ringkasan}</p>
        {tool.diperiksa && (
          <p className={gaya.diperiksa}>
            <Ikon nama="calendar" ukuran={18} />
            Aturan diperiksa <time dateTime={tool.diperiksa}>{tanggalIndonesia(tool.diperiksa)}</time>
          </p>
        )}
      </header>

      {pesan || !contoh?.ok ? (
        <p role="note" className={gaya.pesan}>
          <Ikon nama="triangle-alert" />
          {pesan ?? 'Kalkulator ini sedang diperbarui. Coba lagi nanti.'}
        </p>
      ) : (
        <Kalkulator
          id={ID_KALKULATOR}
          toolId={tool.toolId}
          isian={kalkulator.isian}
          contoh={kalkulator.contoh}
          tombol={kalkulator.tombol}
          lanjutan={kalkulator.lanjutan}
          parameter={tool.parameter}
          teks={tool.bantuan}
          hasilContoh={contoh}
          warna={tool.pilar?.warna ?? null}
        />
      )}

      <div className={gaya.badan}>
        <IsiArtikel isi={tool.penjelasan} cloudName={situs.cloudName} />
        <AturanTool dasar={kalkulator.dasar} />
        <Catatan teks={tool.pilar?.disclaimer ?? null} />
        <BlokSumber sumber={tool.sumber} />
        <Faq faq={tool.faq} />
      </div>
    </article>
  )
}
