import type { RingkasanSitus } from '../aturan'
import { batasSumbu, teksJumlah, teksTanggal } from '../format'

/**
 * Klik per hari selama 28 hari: satu seri satu warna, kolom tipis (paling lebar 24 px) dengan ujung data
 * membulat dari satu garis dasar, garis bantu tipis di batas atas, tanggal pertama dan terakhir di sumbu.
 * HTML dan CSS biasa (tanpa pustaka dan tanpa JavaScript), jadi teks sumbu tetap terbaca di 375 px.
 * Setiap kolom punya `title` (tanggal, klik, impresi) untuk hover; angka lengkap ada di tabel di bawahnya,
 * jadi tidak ada informasi yang hanya bisa dibaca lewat hover atau warna.
 */
export function GrafikKlik({ seri }: { seri: RingkasanSitus['seri'] }) {
  const maks = batasSumbu(Math.max(...seri.map((h) => h.klik)))
  const tertinggi = seri.reduce((a, b) => (b.klik > a.klik ? b : a), seri[0])
  const total = seri.reduce((n, h) => n + h.klik, 0)
  const awal = seri[0].tanggal
  const akhir = seri.at(-1)!.tanggal
  const label =
    `Klik per hari, ${teksTanggal(awal)} sampai ${teksTanggal(akhir)}: total ${teksJumlah(total)}, ` +
    `tertinggi ${teksJumlah(tertinggi.klik)} pada ${teksTanggal(tertinggi.tanggal)}.`
  return (
    <figure className="pantau-grafik">
      <figcaption className="pantau-grafik__judul">Klik per hari</figcaption>
      <div className="pantau-grafik__plot" role="img" aria-label={label}>
        <div className="pantau-grafik__sumbu-y">
          <span>{teksJumlah(maks)}</span>
          <span>0</span>
        </div>
        <div className="pantau-grafik__area">
          {seri.map((h) => (
            <span key={h.tanggal} className="pantau-grafik__kolom" title={`${teksTanggal(h.tanggal)}: ${teksJumlah(h.klik)} klik, ${teksJumlah(h.impresi)} impresi`}>
              {h.klik > 0 && <span style={{ height: `${(h.klik / maks) * 100}%` }} />}
            </span>
          ))}
        </div>
        <div className="pantau-grafik__sumbu-x">
          <span>{teksTanggal(awal, true)}</span>
          <span>{teksTanggal(akhir, true)}</span>
        </div>
      </div>
      <details className="pantau-grafik__tabel">
        <summary>Lihat angka per hari</summary>
        <div className="pantau-gulir" role="region" aria-label="Klik dan impresi per hari" tabIndex={0}>
          <table className="pantau-tabel">
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Klik</th>
                <th scope="col">Impresi</th>
              </tr>
            </thead>
            <tbody>
              {seri.map((h) => (
                <tr key={h.tanggal}>
                  <th scope="row">{teksTanggal(h.tanggal)}</th>
                  <td>{teksJumlah(h.klik)}</td>
                  <td>{teksJumlah(h.impresi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
