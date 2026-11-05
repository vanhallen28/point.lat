'use client'

import { useForm } from '@payloadcms/ui'
import { useState } from 'react'

import { LABEL_POLA, periksaPola, type HasilPola } from '../pola'
import { blokArtikel, type IsianAsisten } from '../teks'

const angka = (n: number) => n.toLocaleString('id-ID')

/**
 * Cek pola tulisan AI di sidebar (spesifikasi §10 butir 4): berjalan di browser dari isian form, tanpa API
 * dan tanpa biaya, termasuk frasa tambahan dari global Asisten AI. Setiap tanda menyebut letak, kutipan,
 * dan alasannya.
 */
export function BagianPola({ frasaTambahan }: { frasaTambahan: string[] }) {
  const { getData } = useForm()
  const [hasil, setHasil] = useState<HasilPola | null>(null)

  const ringkasan = hasil
    ? hasil.jumlahKalimat === 0
      ? 'Belum ada kalimat untuk diperiksa.'
      : hasil.temuan.length === 0
        ? `Tidak ada tanda di ${angka(hasil.jumlahKalimat)} kalimat.`
        : `${angka(hasil.temuan.length)} tanda di ${angka(hasil.jumlahKalimat)} kalimat.`
    : ''

  return (
    <div className="asisten-bagian">
      <h4>Cek pola tulisan AI</h4>
      <p className="asisten__keterangan">
        Menandai frasa klise, em dash dan en dash, pola serba tiga, penutup generik, dan kalimat yang panjangnya seragam. Tanpa AI dan tanpa biaya.
      </p>
      <button type="button" className="asisten__tombol" onClick={() => setHasil(periksaPola(blokArtikel(getData() as IsianAsisten), { frasaTambahan }))}>
        {hasil ? 'Cek ulang pola tulisan' : 'Cek pola tulisan'}
      </button>
      <p role="status" className={hasil ? 'asisten__ringkasan' : 'asisten__sr'}>
        {ringkasan}
      </p>
      {hasil && hasil.temuan.length ? (
        <ol className="asisten-temuan">
          {hasil.temuan.map((t, i) => (
            <li key={`${t.letak}-${t.jenis}-${i}`}>
              <p className="asisten-temuan__kepala">
                <span className="asisten-temuan__jenis">{LABEL_POLA[t.jenis]}</span> <span className="asisten__redup">{t.letak}</span>
              </p>
              <blockquote>{t.kutipan}</blockquote>
              <p>{t.alasan}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
