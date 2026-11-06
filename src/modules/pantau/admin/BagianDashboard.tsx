import { urlAdmin } from '@/lib/admin'

import type { DataDashboard, InfoTugas, TautanBermasalah } from '../dashboard'
import { teksJumlah, teksPersen, teksPosisi, teksRingkas, teksTanggal, teksWaktu } from '../format'
import { LABEL_STATUS_TUGAS, LABEL_TUGAS, type JenisTugas } from '../tipe'
import { GrafikKlik } from './GrafikKlik'
import { TombolPindaiUlang } from './TombolPindaiUlang'

/** Status tugas harian: kapan terakhir berjalan dan kapan berikutnya; gagal tampil sebagai kotak galat. */
function StatusTugas({ jenis, info }: { jenis: JenisTugas; info: InfoTugas | null }) {
  if (!info?.status) return <p className="pantau-tugas">{LABEL_TUGAS[jenis]}: belum pernah berjalan. Cron menjalankannya sekali sehari.</p>
  if (info.status === 'gagal') {
    return (
      <div className="pantau-pesan pantau-pesan--galat">
        <p>
          <strong>{LABEL_TUGAS[jenis]} gagal.</strong> {info.pesan} Dicoba lagi {teksWaktu(info.berikutnya)}.
        </p>
      </div>
    )
  }
  return (
    <p className="pantau-tugas">
      {LABEL_TUGAS[jenis]}: {LABEL_STATUS_TUGAS[info.status].toLowerCase()}
      {info.selesai ? `, ${teksWaktu(info.selesai)}` : ''}. Berikutnya {teksWaktu(info.berikutnya)}.
    </p>
  )
}

/** Kenapa belum ada data Search Console, dan apa yang perlu dilakukan. */
function KosongSearchConsole({ info }: { info: InfoTugas | null }) {
  if (info?.status === 'dilewati') {
    return (
      <p className="pantau-kosong">
        Belum ada data Search Console. {info.pesan} Periksa <a href={urlAdmin.global('pengaturan-seo')}>Status pemasangan di Pengaturan SEO</a>.
      </p>
    )
  }
  if (info?.status === 'berhasil') {
    return (
      <p className="pantau-kosong">
        Search Console belum punya data untuk situs ini. Domain baru biasanya baru punya data beberapa hari setelah halaman pertama
        terindeks.
      </p>
    )
  }
  return <p className="pantau-kosong">Belum ada data Search Console. Data tampil di sini setelah sinkron harian berhasil.</p>
}

export function BagianSearchConsole({ analitik, tugas }: Pick<DataDashboard, 'analitik' | 'tugas'>) {
  const { situs, sampai, halaman } = analitik
  return (
    <section className="pantau-bagian pantau-bagian--lebar" aria-labelledby="pantau-google">
      <h2 id="pantau-google">Performa di Google</h2>
      <StatusTugas jenis="analitik" info={tugas.analitik} />
      {situs && sampai ? (
        <>
          <p className="pantau-keterangan">
            28 hari sampai {teksTanggal(sampai)}. Data Search Console baru final 2 sampai 3 hari kemudian.
          </p>
          <dl className="pantau-angka">
            <div>
              <dt>Klik</dt>
              <dd>{teksRingkas(situs.klik)}</dd>
            </div>
            <div>
              <dt>Impresi</dt>
              <dd>{teksRingkas(situs.impresi)}</dd>
            </div>
            <div>
              <dt>CTR</dt>
              <dd>{teksPersen(situs.ctr)}</dd>
            </div>
            <div>
              <dt>Posisi rata-rata</dt>
              <dd>{teksPosisi(situs.posisi)}</dd>
            </div>
          </dl>
          <GrafikKlik seri={situs.seri} />
        </>
      ) : (
        <KosongSearchConsole info={tugas.analitik} />
      )}
      <h3>Halaman teratas</h3>
      {halaman.length > 0 ? (
        <>
          <div className="pantau-gulir" role="region" aria-label="Halaman teratas di Google, 28 hari" tabIndex={0}>
            <table className="pantau-tabel">
              <thead>
                <tr>
                  <th scope="col">Halaman</th>
                  <th scope="col">Klik</th>
                  <th scope="col">Impresi</th>
                  <th scope="col">CTR</th>
                  <th scope="col">Posisi</th>
                  <th scope="col">Klik 7 hari</th>
                </tr>
              </thead>
              <tbody>
                {halaman.map((h) => (
                  <tr key={h.path}>
                    <th scope="row">
                      <a href={h.path}>{h.path}</a>
                    </th>
                    <td>{teksJumlah(h.klik28)}</td>
                    <td>{teksJumlah(h.impresi28)}</td>
                    <td>{teksPersen(h.ctr28)}</td>
                    <td>{teksPosisi(h.posisi28)}</td>
                    <td>{teksJumlah(h.klik7)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pantau-keterangan">
            Menampilkan {teksJumlah(halaman.length)} dari {teksJumlah(analitik.jumlahHalaman)} halaman yang muncul di Google.
          </p>
        </>
      ) : (
        <p className="pantau-kosong">Belum ada halaman yang muncul di hasil Google.</p>
      )}
    </section>
  )
}

export function BagianStatusIndeks({ statusIndeks }: Pick<DataDashboard, 'statusIndeks'>) {
  const total = statusIndeks.reduce((n, s) => n + s.jumlah, 0)
  const terbanyak = statusIndeks[0]?.jumlah ?? 1
  return (
    <section className="pantau-bagian" aria-labelledby="pantau-indeks">
      <h2 id="pantau-indeks">Status indeks</h2>
      {total > 0 ? (
        <>
          <p className="pantau-keterangan">{teksJumlah(total)} halaman terbit dipantau di Google.</p>
          <ul className="pantau-batang">
            {statusIndeks.map((s) => (
              <li key={s.status}>
                <span className="pantau-batang__label">{s.label}</span>
                <span className="pantau-batang__jalur" aria-hidden="true">
                  <span style={{ width: `${(s.jumlah / terbanyak) * 100}%` }} />
                </span>
                <span className="pantau-batang__nilai">{teksJumlah(s.jumlah)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="pantau-kosong">Belum ada halaman yang dipantau. Status tercatat setelah halaman pertama terbit.</p>
      )}
      <p className="pantau-lanjut">
        <a href={urlAdmin.daftar('status-indeks')}>Buka daftar Status indeks</a>
      </p>
    </section>
  )
}

export function BagianLog({ log }: Pick<DataDashboard, 'log'>) {
  return (
    <section className="pantau-bagian" aria-labelledby="pantau-log">
      <h2 id="pantau-log">Log indexing terbaru</h2>
      {log.gagal7Hari > 0 && (
        <div className="pantau-pesan pantau-pesan--peringatan">
          <p>
            <strong>{teksJumlah(log.gagal7Hari)} langkah gagal</strong> dalam 7 hari terakhir.{' '}
            <a href={`${urlAdmin.daftar('log-indexing')}?where[status][equals]=gagal`}>Lihat penyebabnya di Log indexing</a>
          </p>
        </div>
      )}
      {log.terbaru.length > 0 ? (
        <ol className="pantau-daftar">
          {log.terbaru.map((l) => (
            <li key={l.id}>
              <span>
                <span className={`pantau-tanda pantau-tanda--${l.status}`}>{l.labelStatus}</span> {l.langkah}
              </span>
              <span className="pantau-alamat">{l.url}</span>
              <span className="pantau-waktu">{teksWaktu(l.waktu)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="pantau-kosong">Belum ada kabar ke mesin pencari. Log tercatat saat konten pertama terbit.</p>
      )}
      <p className="pantau-lanjut">
        <a href={urlAdmin.daftar('log-indexing')}>Buka Log indexing</a>
      </p>
    </section>
  )
}

const LABEL_TAUTAN: Record<TautanBermasalah['jenis'], string> = {
  rusak: 'Rusak',
  'luar-rusak': 'Rusak, situs lain',
  dialihkan: 'Alamat lama',
  'luar-cek': 'Perlu dicek manual',
}

/**
 * Tautan rusak dan alamat lama dari pindai harian, dengan tombol "Pindai ulang sekarang" (Rencana 8B) untuk
 * memeriksa lagi setelah tautan diperbaiki; hasilnya juga memperbarui Halaman yatim.
 */
export function BagianTautan({ tautan, tugas, pindai }: Pick<DataDashboard, 'tautan' | 'tugas' | 'pindai'>) {
  return (
    <section className="pantau-bagian pantau-bagian--lebar" aria-labelledby="pantau-tautan">
      <h2 id="pantau-tautan">Tautan rusak</h2>
      <StatusTugas jenis="tautan" info={tugas.tautan} />
      <TombolPindaiUlang batas={pindai} />
      {tautan.length > 0 ? (
        <ul className="pantau-daftar">
          {tautan.map((t) => (
            <li key={`${t.jenis} ${t.tujuan} ${t.sumber.map((s) => s.href).join(' ')}`}>
              <span className={`pantau-tanda pantau-tanda--${t.jenis}`}>{LABEL_TAUTAN[t.jenis]}</span>
              <span className="pantau-alamat">{t.tujuan}</span>
              <span>{t.pesan}</span>
              <span className="pantau-sumber">
                Ada di{' '}
                {t.sumber.map((s, i) => (
                  <span key={s.href}>
                    {i > 0 && ', '}
                    <a href={s.href}>{s.judul}</a>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        tugas.tautan?.status && <p className="pantau-kosong">Tidak ada tautan rusak di konten terbit.</p>
      )}
    </section>
  )
}

export function BagianYatim({ yatim, tugas }: Pick<DataDashboard, 'yatim' | 'tugas'>) {
  return (
    <section className="pantau-bagian" aria-labelledby="pantau-yatim">
      <h2 id="pantau-yatim">Halaman yatim</h2>
      <p className="pantau-keterangan">Artikel dan halaman terbit tanpa tautan masuk dari tulisan lain, menu, atau beranda.</p>
      {yatim.length > 0 ? (
        <ul className="pantau-daftar">
          {yatim.map((y) => (
            <li key={y.path}>
              <a href={y.href}>{y.judul}</a>
              <span className="pantau-alamat">{y.path}</span>
            </li>
          ))}
        </ul>
      ) : tugas.tautan?.status ? (
        <p className="pantau-kosong">Semua artikel dan halaman terbit sudah punya tautan masuk.</p>
      ) : (
        <p className="pantau-kosong">Belum dipindai. Pindai tautan berjalan otomatis sekali sehari.</p>
      )}
    </section>
  )
}

export function Bagian404({ log404 }: Pick<DataDashboard, 'log404'>) {
  return (
    <section className="pantau-bagian" aria-labelledby="pantau-404">
      <h2 id="pantau-404">404 teratas</h2>
      {log404.length > 0 ? (
        <div className="pantau-gulir" role="region" aria-label="Path 404 yang paling sering dikunjungi" tabIndex={0}>
          <table className="pantau-tabel">
            <thead>
              <tr>
                <th scope="col">Path</th>
                <th scope="col">Kunjungan</th>
                <th scope="col">Terakhir</th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {log404.map((l) => (
                <tr key={l.path}>
                  <th scope="row" className="pantau-alamat">
                    {l.path}
                  </th>
                  <td>{teksJumlah(l.jumlah)}</td>
                  <td>{l.terakhir ? teksWaktu(l.terakhir) : '-'}</td>
                  <td>
                    {l.redirect ? (
                      <a href={l.redirect} aria-label={`Lihat redirect untuk ${l.path}`}>
                        Lihat redirect
                      </a>
                    ) : (
                      <a href={urlAdmin.buat('redirect', { dari: l.path })} aria-label={`Buat redirect untuk ${l.path}`}>
                        Buat redirect
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="pantau-kosong">Belum ada kunjungan ke halaman yang tidak ada.</p>
      )}
      <p className="pantau-lanjut">
        <a href={urlAdmin.daftar('log-404')}>Buka Log 404</a>
      </p>
    </section>
  )
}
