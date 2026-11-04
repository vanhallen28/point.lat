import type { BlokTabelPerbandingan } from '@/payload-types'

import gaya from './Isi.module.css'

/**
 * Tabel perbandingan: kolom pertama menjadi kepala baris. Pembungkusnya bisa digeser di HP dan
 * bisa difokus keyboard (region berlabel) supaya isinya tetap terjangkau.
 */
export function TabelPerbandingan({ blok }: { blok: Pick<BlokTabelPerbandingan, 'judul' | 'kolom' | 'baris'> }) {
  const label = blok.judul?.trim() || 'Tabel perbandingan'
  return (
    <div className={gaya.tabel} role="region" aria-label={label} tabIndex={0}>
      <table>
        {blok.judul && <caption>{blok.judul}</caption>}
        <thead>
          <tr>
            {blok.kolom.map((k, i) => (
              <th key={k.id ?? i} scope="col">
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blok.baris.map((b, i) => (
            <tr key={b.id ?? i}>
              {b.sel.map((s, j) =>
                j === 0 ? (
                  <th key={s.id ?? j} scope="row">
                    {s.teks}
                  </th>
                ) : (
                  <td key={s.id ?? j}>{s.teks}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
