import { PATH_ADMIN } from '@/lib/admin'
import { teksJumlah, teksTanggal } from '@/modules/pantau/format'
import { bandingkan } from '@/modules/redaksi/aturan'
import { Ikon } from '@/modules/redaksi/admin/IkonRedaksi'
import { Perubahan } from '@/modules/redaksi/admin/Perubahan'

import { MENIT_ONLINE, paramRentang, PILIHAN_RENTANG, rentangPilihan, SIMPAN_HARI, urlCsvKunjungan, type Rentang } from '../aturan'
import type { AngkaBanding, BarisRincian, DataKunjungan } from '../tipe'

import { GrafikKunjungan } from './GrafikKunjungan'

import './kunjungan.scss'

/** Id bagian, dipakai tautan rentang (`#statistik-kunjungan`) supaya halaman kembali ke bagian ini. */
export const ID_STATISTIK = 'statistik-kunjungan'

const SATU_DESIMAL = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const PERSEN = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 0 })

/** URL beranda admin dengan parameter lain (periode Google) tetap, menuju bagian statistik. */
function urlRentang(r: Rentang, lain: Record<string, string>) {
  const kueri = new URLSearchParams({ ...lain, ...paramRentang(r) }).toString()
  return `${PATH_ADMIN}${kueri ? `?${kueri}` : ''}#${ID_STATISTIK}`
}

export function teksRentang(r: Rentang, hariIni: string): string {
  if (r.dari === r.sampai) return `${r.dari === hariIni ? 'Hari ini, ' : ''}${teksTanggal(r.dari)}`
  const tahunSama = r.dari.slice(0, 4) === r.sampai.slice(0, 4)
  return `${tahunSama ? teksTanggal(r.dari, true) : teksTanggal(r.dari)} sampai ${teksTanggal(r.sampai)}`
}

const KET_BANDING: Record<string, string> = {
  'hari-ini': 'vs kemarin di jam yang sama',
  '7': 'vs 7 hari sebelumnya',
  '30': 'vs 30 hari sebelumnya',
}

function KartuRingkas({
  label,
  angka,
  ket,
  href,
  aktif,
}: {
  label: string
  angka: AngkaBanding | { tayangan: number; kunjungan: number; sebelumnya?: undefined }
  ket: string
  href: string
  aktif: boolean
}) {
  return (
    <li>
      <a className="kunjungan-ringkas" href={href} aria-current={aktif ? 'true' : undefined}>
        <span className="kunjungan-ringkas__label">{label}</span>
        <span className="kunjungan-ringkas__nilai">{teksJumlah(angka.kunjungan)}</span>
        <span className="kunjungan-ringkas__sub">
          kunjungan · {teksJumlah(angka.tayangan)} tayangan
        </span>
        <span className="kunjungan-ringkas__banding">
          {angka.sebelumnya !== undefined && <Perubahan b={bandingkan(angka.kunjungan, angka.sebelumnya?.kunjungan ?? null)} satuan="kunjungan" />}
          <span>{ket}</span>
        </span>
      </a>
    </li>
  )
}

function TabelRincian({
  id,
  judul,
  ket,
  kolom,
  baris,
  kosong = 'Belum ada data pada rentang ini.',
  lebar = false,
  porsi = false,
}: {
  id: string
  judul: string
  ket?: string
  kolom: string
  baris: BarisRincian[]
  kosong?: string
  lebar?: boolean
  /** Baris membagi habis kunjungan (kanal, perangkat): tampilkan persen dan meter terhadap jumlahnya. */
  porsi?: boolean
}) {
  const jumlah = baris.reduce((a, b) => a + b.kunjungan, 0)
  const acuan = porsi ? jumlah : Math.max(...baris.map((b) => b.kunjungan), 1)
  return (
    <section className={`redaksi-kartu kunjungan-rincian${lebar ? ' kunjungan-rincian--lebar' : ''}`} aria-labelledby={`${id}-judul`}>
      <h3 id={`${id}-judul`}>{judul}</h3>
      {ket && <p className="redaksi-ket">{ket}</p>}
      {baris.length === 0 ? (
        <p className="redaksi-kosong">{kosong}</p>
      ) : (
        <table className="kunjungan-tabel">
          <thead>
            <tr>
              <th scope="col">{kolom}</th>
              <th scope="col">Kunjungan</th>
              <th scope="col">Tayangan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.kunci}>
                <th scope="row">
                  <span className="kunjungan-tabel__label" title={b.ket ? `${b.label} (${b.ket})` : b.label}>
                    {b.ikon && (
                      <span className="kunjungan-tabel__ikon" aria-hidden="true">
                        {b.ikon}
                      </span>
                    )}
                    {b.label}
                  </span>
                  {(b.ket || porsi) && (
                    <span className="kunjungan-tabel__ket">
                      {porsi && jumlah > 0 ? `${PERSEN.format(b.kunjungan / jumlah)} kunjungan` : b.ket}
                    </span>
                  )}
                  <span className="kunjungan-meter" aria-hidden="true">
                    <i style={{ width: `${Math.max((b.kunjungan / acuan) * 100, 1.5).toFixed(1)}%` }} />
                  </span>
                </th>
                <td>{teksJumlah(b.kunjungan)}</td>
                <td>{teksJumlah(b.tayangan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/**
 * Statistik kunjungan beranda admin (spesifikasi §26), hanya admin: empat kartu ringkas (Hari ini, 7 hari, 30 hari,
 * Total), pilihan rentang dan kalender (form GET, tanpa JavaScript), grafik, pengunjung yang sedang online, dan
 * rincian negara, kota, sumber, perujuk, halaman, halaman masuk, perangkat, dan peramban. `lain` adalah parameter
 * URL beranda yang dipertahankan (periode angka Google).
 */
export function StatistikKunjungan({ data, lain }: { data: DataKunjungan; lain: Record<string, string> }) {
  const { rentang, hariIni } = data
  const kosongSemua = data.total.tayangan === 0
  const halamanPerKunjungan = data.angka.kunjungan > 0 ? data.angka.tayangan / data.angka.kunjungan : 0
  const pilihan = (jenis: (typeof PILIHAN_RENTANG)[number]['jenis']) => rentangPilihan(jenis, hariIni, data.dataPertama)

  return (
    <section id={ID_STATISTIK} className="kunjungan" aria-labelledby="kunjungan-judul">
      <div className="kunjungan-kepala">
        <div>
          <h2 id="kunjungan-judul">Statistik kunjungan</h2>
          <p className="redaksi-ket">
            Pembaca sungguhan di point.: tanpa cookie, tanpa IP tersimpan; bot dan admin yang sedang masuk tidak dihitung.
          </p>
        </div>
        <p className="kunjungan-online">
          <span className={`kunjungan-online__titik${data.online.pengunjung > 0 ? ' kunjungan-online__titik--aktif' : ''}`} aria-hidden="true" />
          <strong>{teksJumlah(data.online.pengunjung)}</strong> sedang online
        </p>
      </div>

      <ul className="kunjungan-ringkas-baris">
        {data.ringkas.map((r) => (
          <KartuRingkas
            key={r.jenis}
            label={r.label}
            angka={r.angka}
            ket={KET_BANDING[r.jenis] ?? ''}
            href={urlRentang(pilihan(r.jenis), lain)}
            aktif={rentang.jenis === r.jenis}
          />
        ))}
        <KartuRingkas
          label="Total"
          angka={data.total}
          ket={data.dataPertama ? `sejak ${teksTanggal(data.dataPertama)}` : 'belum ada data'}
          href={urlRentang(pilihan('semua'), lain)}
          aktif={rentang.jenis === 'semua'}
        />
      </ul>

      <div className="kunjungan-baris-grafik">
        <section className="redaksi-kartu kunjungan-utama" aria-labelledby="kunjungan-rentang-judul">
          <div className="kunjungan-utama__kepala">
            <div>
              <h3 id="kunjungan-rentang-judul">{teksRentang(rentang, hariIni)}</h3>
              <p className="redaksi-ket">
                {rentang.jenis === 'kustom' ? 'Rentang kalender' : PILIHAN_RENTANG.find((p) => p.jenis === rentang.jenis)?.label}
                {' · '}diperbarui saat halaman dibuka
              </p>
            </div>
            <a className="kunjungan-tombol-garis" href={urlCsvKunjungan(rentang)} download>
              <Ikon nama="unduh" />
              Unduh CSV
            </a>
          </div>

          <form className="kunjungan-rentang" method="get" action={`${PATH_ADMIN}#${ID_STATISTIK}`} aria-label="Rentang statistik kunjungan">
            <nav className="redaksi-periode" aria-label="Pilihan rentang kunjungan">
              <Ikon nama="kalender" />
              {PILIHAN_RENTANG.map((p) => (
                <a key={p.jenis} href={urlRentang(pilihan(p.jenis), lain)} aria-current={rentang.jenis === p.jenis ? 'true' : undefined}>
                  {p.label}
                </a>
              ))}
            </nav>
            <div className="kunjungan-rentang__kalender">
              {Object.entries(lain).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <label>
                <span>Dari</span>
                <input type="date" name="dari" defaultValue={rentang.dari} min={data.dataPertama ?? undefined} max={hariIni} required />
              </label>
              <label>
                <span>Sampai</span>
                <input type="date" name="sampai" defaultValue={rentang.sampai} min={data.dataPertama ?? undefined} max={hariIni} required />
              </label>
              <button type="submit" className="kunjungan-tombol">
                Tampilkan
              </button>
            </div>
          </form>

          <dl className="kunjungan-angka">
            <div>
              <dt>Kunjungan</dt>
              <dd>
                <span className="kunjungan-angka__nilai">{teksJumlah(data.angka.kunjungan)}</span>
                {rentang.jenis !== 'semua' && <Perubahan b={bandingkan(data.angka.kunjungan, data.angka.sebelumnya?.kunjungan ?? null)} satuan="kunjungan" />}
              </dd>
            </div>
            <div>
              <dt>Tayangan halaman</dt>
              <dd>
                <span className="kunjungan-angka__nilai">{teksJumlah(data.angka.tayangan)}</span>
                {rentang.jenis !== 'semua' && <Perubahan b={bandingkan(data.angka.tayangan, data.angka.sebelumnya?.tayangan ?? null)} satuan="tayangan" />}
              </dd>
            </div>
            <div>
              <dt>Halaman per kunjungan</dt>
              <dd>
                <span className="kunjungan-angka__nilai">{SATU_DESIMAL.format(halamanPerKunjungan)}</span>
              </dd>
            </div>
          </dl>

          {data.angka.tayangan > 0 ? (
            <GrafikKunjungan seri={data.seri} tanggal={rentang.dari} />
          ) : (
            <p className="redaksi-kosong">
              {kosongSemua
                ? 'Belum ada kunjungan tercatat. Statistik mulai terisi begitu pembaruan ini terpasang dan pembaca membuka point.'
                : 'Tidak ada kunjungan pada rentang ini. Pilih rentang lain di atas.'}
            </p>
          )}
        </section>

        <section className="redaksi-kartu kunjungan-sekarang" aria-labelledby="kunjungan-sekarang-judul">
          <h3 id="kunjungan-sekarang-judul">Sedang dibaca</h3>
          <p className="redaksi-ket">Pengunjung {MENIT_ONLINE} menit terakhir</p>
          <p className="kunjungan-sekarang__angka">
            <strong>{teksJumlah(data.online.pengunjung)}</strong>
            <span>pengunjung online</span>
          </p>
          {data.online.halaman.length === 0 ? (
            <p className="redaksi-kosong">Tidak ada yang sedang membaca.</p>
          ) : (
            <ol className="kunjungan-sekarang__daftar">
              {data.online.halaman.map((h) => (
                <li key={h.kunci}>
                  <span className="kunjungan-tabel__label" title={h.ket ?? h.label}>
                    {h.label}
                  </span>
                  <span className="kunjungan-sekarang__jumlah">{teksJumlah(h.kunjungan)}</span>
                </li>
              ))}
            </ol>
          )}
          <a className="kunjungan-tautan" href={`${urlRentang(rentang, lain)}`}>
            Perbarui
          </a>
        </section>
      </div>

      <div className="kunjungan-grid">
        <TabelRincian id="kunjungan-halaman" judul="Halaman paling banyak dibuka" kolom="Halaman" baris={data.halaman} lebar />
        <TabelRincian
          id="kunjungan-kanal"
          judul="Sumber kunjungan"
          ket="Dari mana pembaca datang ke point."
          kolom="Sumber"
          baris={data.kanal}
          porsi
        />
        <TabelRincian id="kunjungan-negara" judul="Negara" kolom="Negara" baris={data.negara} />
        <TabelRincian id="kunjungan-kota" judul="Kota" kolom="Kota" baris={data.kota} />
        <TabelRincian
          id="kunjungan-sumber"
          judul="Mesin pencari, media sosial, dan AI"
          kolom="Sumber"
          baris={data.sumber}
          kosong="Belum ada kunjungan dari mesin pencari, media sosial, AI, atau situs lain."
        />
        <TabelRincian
          id="kunjungan-masuk"
          judul="Halaman masuk"
          ket="Halaman pertama yang dibuka pembaca saat tiba di point."
          kolom="Halaman"
          baris={data.masuk}
          lebar
        />
        <TabelRincian id="kunjungan-perujuk" judul="Situs perujuk" kolom="Situs" baris={data.perujuk} kosong="Belum ada kunjungan dari tautan situs lain." />
        <TabelRincian id="kunjungan-perangkat" judul="Perangkat" kolom="Perangkat" baris={data.perangkat} porsi />
        <TabelRincian id="kunjungan-peramban" judul="Peramban" kolom="Peramban" baris={data.peramban} />
        <section className="redaksi-kartu kunjungan-rincian kunjungan-catatan" aria-labelledby="kunjungan-catatan-judul">
          <h3 id="kunjungan-catatan-judul">Cara membaca angka ini</h3>
          <ul>
            <li>
              <strong>Kunjungan</strong>: pembaca berbeda per hari. Pembaca yang sama besok dihitung lagi.
            </li>
            <li>
              <strong>Tayangan</strong>: setiap halaman yang dibuka, termasuk pindah halaman.
            </li>
            <li>Sumber dihitung dari halaman masuk; pindah halaman di dalam point. tidak dihitung sebagai sumber.</li>
            <li>
              Rincian tersimpan {Math.round(SIMPAN_HARI / 30.4)} bulan; total harian tersimpan selamanya.
              {data.rincianTerpotong && ' Rentang ini lebih panjang, jadi rinciannya hanya dari 13 bulan terakhir.'}
            </li>
          </ul>
        </section>
      </div>
    </section>
  )
}
