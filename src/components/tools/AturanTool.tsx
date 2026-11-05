import type { ParameterTampil } from '@/modules/hitung'

import gaya from './Tool.module.css'

/**
 * Parameter yang berlaku pada tanggal hitung, lengkap dengan tanggal berlaku dan sumbernya (rambu
 * kredibilitas, spesifikasi §3). Satu baris per angka; tabel panjang (tarif TER) bisa dibuka.
 */
export function AturanTool({ dasar }: { dasar: ParameterTampil[] }) {
  if (dasar.length === 0) return null
  return (
    <section aria-labelledby="angka-aturan" className={gaya.aturan}>
      <h2 id="angka-aturan" className={gaya.subjudul}>
        Angka aturan yang dipakai
      </h2>
      <p className={gaya.pengantar}>Angka ini tersimpan bersama tanggal berlaku dan sumbernya, dan diperbarui saat aturannya berubah.</p>
      <dl className={gaya.daftarAturan}>
        {dasar.map((d) => (
          <div key={d.kunci}>
            <dt>{d.label}</dt>
            <dd className={gaya.nilaiAturan}>{d.jenis === 'angka' ? d.teks : `${d.baris.length} baris`}</dd>
            <dd className={gaya.metaAturan}>
              Berlaku {d.berlaku}.
              {d.sumber && (
                <>
                  {' '}
                  Sumber:{' '}
                  <a href={d.sumber.url} rel="noopener">
                    {d.sumber.judul}
                  </a>
                </>
              )}
            </dd>
            {d.jenis === 'tabel' && (
              <dd className={gaya.metaAturan}>
                <details className={gaya.tabelAturan}>
                  <summary>
                    Lihat tabel<span className="sr"> {d.label}</span>
                  </summary>
                  <table>
                    <caption className="sr">{d.label}</caption>
                    <thead>
                      <tr>
                        {d.kolom.map((k) => (
                          <th key={k} scope="col">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.baris.map((b, n) => (
                        <tr key={n}>
                          {b.map((sel, m) => (
                            <td key={m}>{sel}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
