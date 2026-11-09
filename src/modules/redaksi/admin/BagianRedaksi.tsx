import { teksJumlah, teksRingkas } from '@/modules/pantau/format'

import type { DataRuangRedaksi, ItemPerhatian, StatusChip } from '../tipe'

import { DonatIndeks, GarisKecil, GrafikPekan } from './GrafikRedaksi'
import { Ikon } from './IkonRedaksi'
import { Perubahan } from './Perubahan'

const PERSEN = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 0 })
const TANGGAL_JAKARTA = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })
const USD = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 2 })

/** US$3,10 (bukan "USD 3,10"). */
const teksUsd = (n: number) => USD.format(n).replace(/^USD\s?/, 'US$')

const tanggalPendek = (iso: string) => TANGGAL_JAKARTA.format(new Date(iso))

function KartuAngka({
  label,
  nilai,
  aksen,
  children,
}: {
  label: string
  nilai: string
  aksen: 'biru' | 'hijau' | 'kuning' | 'oranye'
  children?: React.ReactNode
}) {
  return (
    <section className={`redaksi-kartu redaksi-angka redaksi-angka--${aksen}`} aria-label={label}>
      <h2 className="redaksi-angka__label">{label}</h2>
      <p className="redaksi-angka__nilai">{nilai}</p>
      {children}
    </section>
  )
}

/** Empat kartu angka: Search Console dan indeks untuk admin; untuk editor, artikel dan pesan. */
export function BarisAngka({ data }: { data: DataRuangRedaksi }) {
  const { artikel, google, indeks, periode } = data
  const pekanIni = (
    <p className="redaksi-angka__ket">
      <span className="redaksi-perubahan redaksi-perubahan--naik">+{teksJumlah(artikel.terbitPekanIni)}</span> terbit pekan ini
    </p>
  )
  if (!data.admin) {
    const pesan = data.perhatian.find((p) => p.kunci === 'pesan')?.jumlah ?? 0
    return (
      <div className="redaksi-angka-baris">
        <KartuAngka label="Artikel terbit" nilai={teksJumlah(artikel.terbit)} aksen="biru">
          {pekanIni}
        </KartuAngka>
        <KartuAngka label="Draf" nilai={teksJumlah(artikel.draf)} aksen="hijau">
          <p className="redaksi-angka__ket">Belum terbit, belum dijadwalkan</p>
        </KartuAngka>
        <KartuAngka label="Terjadwal" nilai={teksJumlah(artikel.terjadwal)} aksen="kuning">
          <p className="redaksi-angka__ket">Terbit otomatis sesuai jadwal</p>
        </KartuAngka>
        <KartuAngka label="Pesan baru" nilai={teksJumlah(pesan)} aksen="oranye">
          <p className="redaksi-angka__ket">Dari form kontak</p>
        </KartuAngka>
      </div>
    )
  }
  const persenIndeks = indeks && indeks.total ? indeks.terindeks / indeks.total : 0
  return (
    <div className="redaksi-angka-baris">
      <KartuAngka label="Klik dari Google" nilai={google ? teksRingkas(google.klik.sekarang) : '-'} aksen="biru">
        {google ? (
          <>
            <Perubahan b={google.klik} satuan="klik" />
            <GarisKecil nilai={google.seriKlik} warna="var(--redaksi-merek)" />
            <p className="redaksi-angka__ket">
              {periode} hari{google.klik.sebelumnya !== null ? `, sebelumnya ${teksJumlah(google.klik.sebelumnya)}` : ''}
            </p>
          </>
        ) : (
          <p className="redaksi-angka__ket">Belum ada data Search Console</p>
        )}
      </KartuAngka>
      <KartuAngka label="Impresi" nilai={google ? teksRingkas(google.impresi.sekarang) : '-'} aksen="hijau">
        {google ? (
          <>
            <Perubahan b={google.impresi} satuan="impresi" />
            <GarisKecil nilai={google.seriImpresi} warna="var(--redaksi-hijau)" />
            <p className="redaksi-angka__ket">
              {periode} hari{google.impresi.sebelumnya !== null ? `, sebelumnya ${teksRingkas(google.impresi.sebelumnya)}` : ''}
            </p>
          </>
        ) : (
          <p className="redaksi-angka__ket">Belum ada data Search Console</p>
        )}
      </KartuAngka>
      <KartuAngka label="Artikel terbit" nilai={teksJumlah(artikel.terbit)} aksen="kuning">
        {pekanIni}
        <p className="redaksi-angka__ket">
          {teksJumlah(artikel.draf)} draf, {teksJumlah(artikel.terjadwal)} terjadwal
        </p>
      </KartuAngka>
      <KartuAngka label="Terindeks Google" nilai={indeks ? `${teksJumlah(indeks.terindeks)}/${teksJumlah(indeks.total)}` : '-'} aksen="oranye">
        <div className="redaksi-meter" aria-hidden="true">
          <i style={{ width: `${persenIndeks * 100}%` }} />
        </div>
        <p className="redaksi-angka__ket">
          {indeks && indeks.total ? `${PERSEN.format(persenIndeks)} halaman sudah di indeks Google` : 'Belum ada halaman yang dicek'}
        </p>
      </KartuAngka>
    </div>
  )
}

const LABEL_KOLOM = ['Pekan lalu', 'Pekan ini', 'Pekan depan']
const LABEL_KEADAAN = { terbit: 'Terbit', terjadwal: 'Terjadwal', draf: 'Draf' } as const

/** Kalender konten per pilar (pengganti swimlane di gambar referensi). */
export function KalenderKonten({ kalender }: { kalender: DataRuangRedaksi['kalender'] }) {
  return (
    <section className="redaksi-kartu redaksi-kalender" aria-labelledby="redaksi-kalender-judul">
      <h2 id="redaksi-kalender-judul">Kalender konten per pilar</h2>
      <p className="redaksi-ket">Tulisan terbit, terjadwal, dan draf, tiga pekan</p>
      <div className="redaksi-kalender__gulir">
        <table className="redaksi-kalender__tabel">
          <thead>
            <tr>
              <th scope="col">Pilar</th>
              {kalender.kolom.map((k, i) => (
                <th scope="col" key={k.mulai} className={k.ini ? 'redaksi-kalender__ini' : undefined} aria-current={k.ini ? 'date' : undefined}>
                  {LABEL_KOLOM[i]}
                  <span>
                    {tanggalPendek(k.mulai)} sampai {tanggalPendek(k.akhir)}
                  </span>
                </th>
              ))}
              <th scope="col">Draf</th>
            </tr>
          </thead>
          <tbody>
            {kalender.baris.map((b) => (
              <tr key={b.pilar.id} data-warna={b.pilar.warna ?? undefined}>
                <th scope="row">
                  <span className="redaksi-pilar">
                    <i className="redaksi-titik" aria-hidden="true" />
                    {b.pilar.nama}
                  </span>
                  <span className="redaksi-kalender__jumlah">{teksJumlah(b.jumlahTerbit)} artikel terbit</span>
                </th>
                {b.sel.map((s, i) => (
                  <td key={i} className={kalender.kolom[i]?.ini ? 'redaksi-kalender__ini' : undefined}>
                    {s.chip.length > 0 && (
                      <ul>
                        {s.chip.map((c) => (
                          <li key={c.id}>
                            <a className={`redaksi-chip redaksi-chip--${c.keadaan}`} href={c.href} title={c.judul}>
                              <span className="redaksi-sr">{LABEL_KEADAAN[c.keadaan]}: </span>
                              {c.judul}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.sisa > 0 && <p className="redaksi-kalender__sisa">+{teksJumlah(s.sisa)} lagi</p>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="redaksi-legenda" aria-label="Keterangan">
        <li>
          <i className="redaksi-contoh redaksi-contoh--terbit" aria-hidden="true" />
          Terbit
        </li>
        <li>
          <i className="redaksi-contoh redaksi-contoh--terjadwal" aria-hidden="true" />
          Terjadwal
        </li>
        <li>
          <i className="redaksi-contoh redaksi-contoh--draf" aria-hidden="true" />
          Draf
        </li>
        <li>
          <i className="redaksi-contoh redaksi-contoh--ini" aria-hidden="true" />
          Pekan ini
        </li>
      </ul>
    </section>
  )
}

/** Kolom kanan: klik per pekan dan status indeks (hanya admin). */
export function KolomGoogle({ data }: { data: DataRuangRedaksi }) {
  return (
    <div className="redaksi-kolom">
      <section className="redaksi-kartu" aria-labelledby="redaksi-pekan-judul">
        <h2 id="redaksi-pekan-judul">Klik per pekan</h2>
        <p className="redaksi-ket">Dari Google Search, 8 pekan terakhir</p>
        {data.klikPekan ? <GrafikPekan pekan={data.klikPekan} /> : <p className="redaksi-kosong">Belum ada data Search Console.</p>}
      </section>
      <section className="redaksi-kartu" aria-labelledby="redaksi-indeks-judul">
        <h2 id="redaksi-indeks-judul">Status indeks</h2>
        <p className="redaksi-ket">Halaman yang dikabarkan ke Google</p>
        {data.indeks && data.indeks.total > 0 ? (
          <DonatIndeks terindeks={data.indeks.terindeks} menunggu={data.indeks.menunggu} bermasalah={data.indeks.bermasalah} />
        ) : (
          <p className="redaksi-kosong">Belum ada halaman yang dicek.</p>
        )}
      </section>
    </div>
  )
}

const IKON_STATUS: Record<StatusChip, 'centang' | 'jam' | 'silang'> = { baik: 'centang', waspada: 'jam', kritis: 'silang' }

/** Chip status berikon dan berlabel. */
export function ChipStatus({ status, label }: { status: StatusChip; label: string }) {
  return (
    <span className={`redaksi-status redaksi-status--${status}`}>
      <Ikon nama={IKON_STATUS[status]} ukuran={13} />
      {label}
    </span>
  )
}

/** Terbit terbaru: tanggal, judul (ke form artikel), pilar, klik 7 hari dan status Google (admin). */
export function TabelTerbit({ data }: { data: DataRuangRedaksi }) {
  return (
    <section className="redaksi-kartu redaksi-terbit" aria-labelledby="redaksi-terbit-judul">
      <h2 id="redaksi-terbit-judul">Terbit terbaru</h2>
      <p className="redaksi-ket">{data.admin ? 'Klik 7 hari dan status di Google' : 'Enam tulisan terakhir yang terbit'}</p>
      {data.terbitTerbaru.length ? (
        <div className="redaksi-tabel-gulir">
          <table className="redaksi-tabel">
            <thead>
              <tr>
                <th scope="col">Terbit</th>
                <th scope="col">Judul</th>
                <th scope="col">Pilar</th>
                {data.admin && (
                  <>
                    <th scope="col" className="redaksi-angka-sel">
                      Klik
                    </th>
                    <th scope="col">Status Google</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.terbitTerbaru.map((a) => (
                <tr key={a.id} data-warna={a.pilar?.warna ?? undefined}>
                  <td className="redaksi-tabel__tanggal">{a.terbitPada ? tanggalPendek(a.terbitPada) : '-'}</td>
                  <th scope="row" className="redaksi-tabel__judul">
                    <a href={a.href}>{a.judul}</a>
                  </th>
                  <td>
                    {a.pilar && (
                      <span className="redaksi-pilar">
                        <i className="redaksi-titik" aria-hidden="true" />
                        {a.pilar.nama}
                      </span>
                    )}
                  </td>
                  {data.admin && (
                    <>
                      <td className="redaksi-angka-sel">{a.klik7 === null ? '-' : teksJumlah(a.klik7)}</td>
                      <td>{a.indeks ? <ChipStatus status={a.indeks.status} label={a.indeks.label} /> : <span className="redaksi-redup">Belum dicek</span>}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="redaksi-kosong">Belum ada artikel yang terbit.</p>
      )}
    </section>
  )
}

/** Kesehatan situs (admin): bar persentase dan anggaran AI bulan ini. */
export function KesehatanSitus({ kesehatan }: { kesehatan: NonNullable<DataRuangRedaksi['kesehatan']> }) {
  return (
    <section className="redaksi-kartu" aria-labelledby="redaksi-sehat-judul">
      <h2 id="redaksi-sehat-judul">Kesehatan situs</h2>
      <p className="redaksi-ket">Dari pindai dan cek indeks harian</p>
      <ul className="redaksi-sehat">
        {kesehatan.item.map((k) => {
          const r = k.total > 0 ? Math.max(0, Math.min(1, k.bagian / k.total)) : null
          return (
            <li key={k.label}>
              <p className="redaksi-sehat__baris">
                <span>{k.label}</span>
                <strong>{r === null ? '-' : PERSEN.format(r)}</strong>
              </p>
              <div className="redaksi-meter" aria-hidden="true">
                <i style={{ width: `${(r ?? 0) * 100}%` }} />
              </div>
              <p className="redaksi-sehat__ket">{k.total > 0 ? k.keterangan : 'Belum ada data'}</p>
            </li>
          )
        })}
      </ul>
      {kesehatan.anggaranAi && (
        <div className="redaksi-ringkas">
          <Ikon nama="bintang" ukuran={18} />
          <p>
            <strong>
              Anggaran AI: {teksUsd(kesehatan.anggaranAi.terpakai)} dari {teksUsd(kesehatan.anggaranAi.batas)}
            </strong>
            <span>Bulan ini, sisa {teksUsd(Math.max(0, kesehatan.anggaranAi.batas - kesehatan.anggaranAi.terpakai))}</span>
          </p>
        </div>
      )}
    </section>
  )
}

const TINGKAT: Record<ItemPerhatian['tingkat'], { label: string; ikon: 'seru' | 'centang' }> = {
  segera: { label: 'Segera', ikon: 'seru' },
  pekan: { label: 'Pekan ini', ikon: 'seru' },
  aman: { label: 'Aman', ikon: 'centang' },
}

/** Perlu perhatian: linimasa berpenanda tingkat, setiap baris membuka daftar yang tersaring. */
export function PerluPerhatian({ item }: { item: ItemPerhatian[] }) {
  return (
    <section className="redaksi-kartu" aria-labelledby="redaksi-perhatian-judul">
      <h2 id="redaksi-perhatian-judul">Perlu perhatian</h2>
      <p className="redaksi-ket">Urut dari yang paling penting</p>
      <ol className="redaksi-perhatian">
        {item.map((i) => (
          <li key={i.kunci} data-tingkat={i.tingkat}>
            <span className="redaksi-perhatian__penanda" aria-hidden="true">
              <Ikon nama={TINGKAT[i.tingkat].ikon} ukuran={14} />
            </span>
            <a href={i.href}>
              <span className="redaksi-perhatian__label">{i.label}</span>
              <span className="redaksi-perhatian__ket">
                <span className="redaksi-sr">{TINGKAT[i.tingkat].label}. </span>
                {i.keterangan}
              </span>
            </a>
            <span className="redaksi-perhatian__jumlah">{teksJumlah(i.jumlah)}</span>
          </li>
        ))}
      </ol>
      <ul className="redaksi-legenda" aria-label="Keterangan">
        {(['segera', 'pekan', 'aman'] as const).map((t) => (
          <li key={t} data-tingkat={t}>
            <i className="redaksi-titik" aria-hidden="true" />
            {TINGKAT[t].label}
          </li>
        ))}
      </ul>
    </section>
  )
}

