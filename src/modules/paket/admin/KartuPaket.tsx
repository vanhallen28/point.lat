import { urlAdmin } from '@/lib/admin'
import { teksWaktu } from '@/modules/pantau/format'
import { Ikon } from '@/modules/redaksi/admin/IkonRedaksi'

import type { StatusPaket } from '../status'

import { TombolImpor } from './TombolImpor'

import './paket.scss'

/** Daftar artikel admin yang tersaring ke artikel paket (draf dan terbit). */
function urlDaftarPaket(slug: string[]): string {
  return `${urlAdmin.daftar('artikel')}?${new URLSearchParams({ 'where[slug][in]': slug.join(',') })}`
}

const ALASAN_BERANDA = {
  ditambah: 'Blok Pilihan redaksi ditambahkan ke beranda. Kartunya tampil setelah artikel pilihannya terbit.',
  'sudah-ada': 'Beranda sudah punya blok Pilihan redaksi, jadi tidak diubah.',
  dilewati: 'Beranda tidak diubah.',
} as const

/**
 * Kartu "Paket konten awal" di beranda admin (hanya admin, spesifikasi §24): tombol impor, kemajuan artikel paket
 * (masuk dan terbit), langkah sebelum terbit, dan ringkasan impor terakhir. Kartu hilang setelah semua artikel
 * paket terbit.
 */
export function KartuPaket({ status }: { status: StatusPaket }) {
  const { total, ada, terbit, berjalan, terakhir } = status
  const belumMasuk = total - ada
  return (
    <section className="redaksi-kartu paket" aria-labelledby="paket-judul">
      <div className="paket__kepala">
        <span className="paket__ikon">
          <Ikon nama="paket" ukuran={20} />
        </span>
        <div>
          <h2 id="paket-judul">{status.nama}</h2>
          <p className="redaksi-ket">
            {total} artikel Uang &amp; Karier dan Belajar, plus penjelasan lengkap enam kalkulator
          </p>
        </div>
        <p className="paket__angka" aria-label={`${ada} dari ${total} artikel masuk, ${terbit} terbit`}>
          <span>
            <strong>{ada}</strong>/{total} masuk
          </span>
          <span>
            <strong>{terbit}</strong> terbit
          </span>
        </p>
      </div>

      {ada === 0 ? (
        <p className="paket__teks">
          Artikel masuk sebagai draf lengkap: kartu sampul, Intinya, isi dengan contoh hitung, FAQ, sumber, dan isian SEO.
          Topiknya di sekitar kalkulator dan musim pencarian: gaji dan PPh 21, BPJS, THR Lebaran 2027, lembur, SPT Tahunan,
          KPR, IPK, SNBP dan UTBK 2027, serta KIP Kuliah. Penjelasan kalkulator yang masih draf ikut dilengkapi.
        </p>
      ) : (
        <ol className="paket__langkah">
          <li>Buka setiap draf, cocokkan angka dengan sumbernya, dan tambahkan pengalaman atau sudut pandangmu.</li>
          <li>Centang ketiga butir Review sebelum terbit di sidebar, lalu terbitkan. Terbitkan bertahap, misalnya tiga sampai empat artikel per pekan.</li>
          <li>Buka menu Tools, baca penjelasan setiap kalkulator, lalu terbitkan.</li>
        </ol>
      )}

      <div className="paket__aksi">
        {belumMasuk > 0 || !terakhir ? <TombolImpor berjalan={berjalan !== null} ada={ada} /> : null}
        {ada > 0 && (
          <a className="paket__tautan" href={urlDaftarPaket(status.slug)}>
            Buka artikel paket
          </a>
        )}
      </div>

      {berjalan && <p className="redaksi-ket">Impor sedang berjalan sejak {teksWaktu(berjalan)}.</p>}

      {terakhir && !berjalan && (
        <details className="paket__hasil">
          <summary>Hasil impor terakhir, {teksWaktu(terakhir.selesaiPada)}</summary>
          <ul>
            <li>
              Artikel baru: {terakhir.artikel.dibuat.length}. Sudah ada sebelumnya: {terakhir.artikel.sudahAda.length}.
            </li>
            {terakhir.subkategori.dibuat.length > 0 && <li>Subkategori baru: {terakhir.subkategori.dibuat.join(', ')}.</li>}
            <li>
              Kalkulator diperbarui: {terakhir.tools.diperbarui.length > 0 ? terakhir.tools.diperbarui.join(', ') : 'tidak ada'}.
            </li>
            {terakhir.tools.dilewati.map((t) => (
              <li key={t.toolId}>
                {t.toolId}: {t.alasan}
              </li>
            ))}
            <li>{ALASAN_BERANDA[terakhir.beranda]}</li>
            {terakhir.galat.map((g) => (
              <li key={g} className="paket__galat">
                {g}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
