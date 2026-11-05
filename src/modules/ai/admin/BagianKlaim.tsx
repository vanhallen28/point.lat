'use client'

import { useForm } from '@payloadcms/ui'
import { useState } from 'react'

import { LABEL_PEMICU, periksaKlaim, type HasilKlaim, type TemuanKlaim } from '../klaim'
import { blokArtikel, type IsianAsisten } from '../teks'

const LABEL_STATUS: Record<TemuanKlaim['status'], string> = {
  'tanpa-sumber': 'Tanpa sumber',
  'atribusi-kabur': 'Atribusi kabur',
  bertaut: 'Bertaut',
  'cocok-sumber': 'Menyebut sumber',
}

function DaftarKlaim({ klaim }: { klaim: TemuanKlaim[] }) {
  return (
    <ol className="asisten-temuan">
      {klaim.map((k, i) => (
        <li key={`${k.letak}-${i}`}>
          <p className="asisten-temuan__kepala">
            <span className="asisten-temuan__jenis">{LABEL_STATUS[k.status]}</span>{' '}
            <span className="asisten__redup">
              {k.letak}, {k.pemicu.map((p) => LABEL_PEMICU[p]).join(', ')}
            </span>
          </p>
          <blockquote>{k.kutipan}</blockquote>
          <p>{k.alasan}</p>
        </li>
      ))}
    </ol>
  )
}

/**
 * Cek klaim di sidebar (spesifikasi §10 butir 5): angka dan klaim yang belum terhubung ke sumber di
 * atas, klaim yang sudah bertaut atau menyebut sumber di bagian yang bisa dibuka. Tanpa API: memeriksa
 * kebenaran angkanya tetap tugas editor.
 */
export function BagianKlaim() {
  const { getData } = useForm()
  const [hasil, setHasil] = useState<HasilKlaim | null>(null)

  function periksa() {
    const data = getData() as IsianAsisten
    // Field array tanpa baris tersimpan di state form sebagai jumlah barisnya (0), bukan array kosong.
    setHasil(periksaKlaim(blokArtikel(data), Array.isArray(data.sumber) ? data.sumber : []))
  }

  const perlu = hasil?.klaim.filter((k) => k.status === 'tanpa-sumber' || k.status === 'atribusi-kabur') ?? []
  const aman = hasil?.klaim.filter((k) => k.status === 'bertaut' || k.status === 'cocok-sumber') ?? []
  const ringkasan = !hasil
    ? ''
    : hasil.klaim.length === 0
      ? 'Tidak ada angka atau klaim beratribusi.'
      : `${hasil.perluDicek} dari ${hasil.klaim.length} klaim perlu dicek.${hasil.jumlahSumber === 0 ? ' Blok Sumber masih kosong.' : ''}`

  return (
    <div className="asisten-bagian">
      <h4>Cek klaim</h4>
      <p className="asisten__keterangan">Menandai angka dan klaim yang belum terhubung ke sumber. Kebenaran angkanya tetap kamu yang memeriksa.</p>
      <button type="button" className="asisten__tombol" onClick={periksa}>
        {hasil ? 'Cek ulang klaim' : 'Cek klaim'}
      </button>
      <p role="status" className={hasil ? 'asisten__ringkasan' : 'asisten__sr'}>
        {ringkasan}
      </p>
      {perlu.length ? <DaftarKlaim klaim={perlu} /> : null}
      {aman.length ? (
        <details className="asisten-rincian">
          <summary>{aman.length} klaim sudah bertaut atau menyebut sumber</summary>
          <DaftarKlaim klaim={aman} />
        </details>
      ) : null}
    </div>
  )
}
