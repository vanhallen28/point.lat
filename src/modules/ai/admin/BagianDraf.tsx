'use client'

import { useForm, useFormFields } from '@payloadcms/ui'
import { useId, useState, type ReactNode } from 'react'

import { htmlDraf, teksDraf, type HasilDraf } from '../prompt/draf'

import type { Minta } from './AsistenAi'
import { briefDari } from './BagianBrief'
import { TombolSalin } from './TombolSalin'
import { useTerapkan } from './terapkan'

type Keadaan = { tahap: 'awal' } | { tahap: 'memuat' } | { tahap: 'hasil'; hasil: HasilDraf } | { tahap: 'galat'; pesan: string }

/** Pratinjau draf: bukan heading sungguhan, supaya struktur heading halaman admin tidak berubah. */
function PratinjauDraf({ draf }: { draf: HasilDraf }) {
  const isi: ReactNode[] = []
  let butir: string[] = []
  const tutup = (kunci: number) => {
    if (butir.length) isi.push(<ul key={`ul-${kunci}`}>{butir.map((b) => <li key={b}>{b}</li>)}</ul>)
    butir = []
  }
  draf.blok.forEach((b, i) => {
    if (b.jenis === 'butir') {
      butir.push(b.teks)
      return
    }
    tutup(i)
    isi.push(
      <p key={i} className={b.jenis === 'h3' ? 'asisten-draf__h3' : undefined}>
        {b.teks}
      </p>,
    )
  })
  tutup(draf.blok.length)
  return (
    <div className="asisten-draf">
      <p className="asisten-draf__h2">{draf.h2}</p>
      {isi}
    </div>
  )
}

/**
 * Draf per bagian di sidebar (spesifikasi §10 butir 2): satu H2 per permintaan dari poin brief dan catatan
 * penulis. Draf tidak disisipkan ke editor isi; editor menyalinnya ke posisi yang dia pilih. Menyalin
 * menandai artikel memakai draf AI, jadi checklist review wajib sebelum terbit.
 */
export function BagianDraf({ minta, nonaktif }: { minta: Minta; nonaktif: boolean }) {
  const { getData } = useForm()
  const terapkan = useTerapkan()
  const brief = briefDari(useFormFields(([f]) => f.briefAi?.value))
  const [pilihan, setPilihan] = useState('')
  const [h2, setH2] = useState('')
  const [catatan, setCatatan] = useState('')
  const [keadaan, setKeadaan] = useState<Keadaan>({ tahap: 'awal' })
  const id = useId()
  const memuat = keadaan.tahap === 'memuat'
  const outline = brief?.dariModel.outline ?? []

  function pilih(nilai: string) {
    setPilihan(nilai)
    if (nilai) setH2(nilai)
  }

  async function tulis() {
    const data = getData() as { judul?: string; seo?: { keyphrase?: string | null } | null }
    const bagian = outline.find((o) => o.h2 === h2.trim())
    setKeadaan({ tahap: 'memuat' })
    const jawaban = await minta('draf', {
      judul: data.judul ?? '',
      keyphrase: data.seo?.keyphrase ?? '',
      h2,
      poin: bagian ? [...bagian.h3, ...(bagian.catatan ? [bagian.catatan] : [])] : [],
      outline: outline.map((o) => o.h2),
      catatan,
    })
    setKeadaan(jawaban.status === 'berhasil' ? { tahap: 'hasil', hasil: jawaban.hasil as HasilDraf } : { tahap: 'galat', pesan: jawaban.pesan })
  }

  const hasil = keadaan.tahap === 'hasil' ? keadaan.hasil : null
  const status = memuat ? 'Menulis draf bagian...' : hasil ? 'Draf bagian siap. Salin, tempel di editor isi, lalu tulis ulang.' : keadaan.tahap === 'galat' ? keadaan.pesan : ''

  return (
    <div className="asisten-bagian">
      <h4>Draf per bagian</h4>
      <p className="asisten__keterangan">Satu subjudul H2 per permintaan, dari poin brief dan catatanmu. Angka yang tidak ada di catatanmu ditandai [cek angka].</p>
      {outline.length ? (
        <>
          <label className="asisten__label" htmlFor={`${id}-bagian`}>
            Bagian dari brief
          </label>
          <select id={`${id}-bagian`} className="asisten__input" value={pilihan} onChange={(e) => pilih(e.target.value)}>
            <option value="">Tulis subjudul sendiri</option>
            {outline.map((o) => (
              <option key={o.h2} value={o.h2}>
                {o.h2}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <label className="asisten__label" htmlFor={`${id}-h2`}>
        Subjudul (H2)
      </label>
      <input id={`${id}-h2`} className="asisten__input" type="text" value={h2} onChange={(e) => setH2(e.target.value)} maxLength={200} />
      <label className="asisten__label" htmlFor={`${id}-catatan`}>
        Catatan penulis
      </label>
      <p className="asisten__catatan" id={`${id}-catatan-ket`}>
        Angka yang sudah kamu cek, pengalamanmu, dan sudut yang mau kamu ambil. Hanya angka dari sini yang dipakai draf.
      </p>
      <textarea
        id={`${id}-catatan`}
        className="asisten__input asisten__input--teks"
        aria-describedby={`${id}-catatan-ket`}
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        maxLength={4_000}
        rows={4}
      />
      <button type="button" className="asisten__tombol" onClick={tulis} disabled={nonaktif || memuat || !h2.trim()} aria-busy={memuat}>
        {memuat ? 'Menulis draf bagian...' : 'Tulis draf bagian'}
      </button>
      <p role="status" className={keadaan.tahap === 'galat' ? 'asisten__pesan asisten__pesan--galat' : status ? 'asisten__ringkasan' : 'asisten__sr'}>
        {status}
      </p>
      {hasil ? (
        <div className="asisten-hasil">
          {hasil.catatan.length ? (
            <ul className="asisten__catatan">
              {hasil.catatan.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          <PratinjauDraf draf={hasil} />
          {hasil.perluDicek.length ? (
            <div className="asisten-saran">
              <p className="asisten-saran__label">Perlu dicek ke sumber resmi</p>
              <ul>
                {hasil.perluDicek.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="asisten__catatan">Menyalin draf menandai artikel memakai draf AI: checklist review wajib sebelum terbit.</p>
          <TombolSalin teks={teksDraf(hasil)} html={htmlDraf(hasil)} label="Salin draf" onSalin={() => terapkan.tandaiDrafAi()} />
        </div>
      ) : null}
    </div>
  )
}
