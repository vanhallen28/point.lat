'use client'

import { useForm, useFormFields } from '@payloadcms/ui'
import { useId, useState } from 'react'

import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'

import type { HasilBrief } from '../prompt/brief'

import type { Minta } from './AsistenAi'

type Keadaan = { tahap: 'awal' } | { tahap: 'memuat' } | { tahap: 'hasil' } | { tahap: 'galat'; pesan: string }

const LABEL_INTENT: Record<HasilBrief['dariModel']['intent'], string> = {
  informasional: 'Informasional',
  komersial: 'Komersial',
  transaksional: 'Transaksional',
  navigasional: 'Navigasional',
}

/** Brief tersimpan di field `briefAi`, atau `null` bila belum ada atau bentuknya bukan brief. */
export function briefDari(nilai: unknown): HasilBrief | null {
  const b = nilai as HasilBrief | null
  return b && typeof b === 'object' && b.dariModel && Array.isArray(b.dariModel.outline) ? b : null
}

const idRelasi = (v: unknown) => (v && typeof v === 'object' ? (v as { id?: unknown }).id : v)

function TautanBaru({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** Isi brief: perkiraan Claude, data dari database point., lalu langkah manual. */
function IsiBrief({ brief }: { brief: HasilBrief }) {
  const { dariModel: m, dariPoint: d } = brief
  return (
    <div className="asisten-hasil">
      {brief.catatan.length ? (
        <ul className="asisten__catatan">
          {brief.catatan.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
      <div className="asisten-saran">
        <h5>Perkiraan Claude, perlu kamu nilai</h5>
        <dl>
          <dt>Judul kerja</dt>
          <dd>{m.judulKerja}</dd>
          <dt>Intent</dt>
          <dd>
            {LABEL_INTENT[m.intent]}. {m.alasanIntent}
          </dd>
          <dt>Format</dt>
          <dd>
            {LABEL_TIPE_ARTIKEL[m.format]}. {m.alasanFormat}
          </dd>
          <dt>Keyphrase sekunder</dt>
          <dd>{m.keyphraseSekunder.join(', ') || 'Tidak ada.'}</dd>
          <dt>Sudut pembeda</dt>
          <dd>{m.sudutPembeda || 'Tidak ada.'}</dd>
        </dl>
        <p className="asisten-saran__label">Outline</p>
        <ol>
          {m.outline.map((o) => (
            <li key={o.h2}>
              {o.h2}
              {o.h3.length ? (
                <ul>
                  {o.h3.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
              {o.catatan ? <p className="asisten__catatan">{o.catatan}</p> : null}
            </li>
          ))}
        </ol>
        <p className="asisten-saran__label">Pertanyaan pembaca</p>
        <ul>
          {m.pertanyaan.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="asisten-saran__label">Perlu dicek ke sumber resmi</p>
        <ul>
          {m.perluDicek.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="asisten-saran">
        <h5>Dari database point.</h5>
        <p>
          <span className="asisten-saran__label">Panjang acuan:</span> {d.panjangAcuan}, acuan dan bukan kuota.
        </p>
        <p className="asisten-saran__label">Keyword yang sudah dipakai</p>
        {d.kanibalisasi.length ? (
          <ul>
            {d.kanibalisasi.map((a) => (
              <li key={a.id}>
                <TautanBaru href={a.urlAdmin}>{a.judul}</TautanBaru> ({a.tingkat === 'sama' ? 'keyphrase sama' : 'sangat mirip'}: {a.keyphrase})
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada artikel lain dengan keyword ini atau yang sangat mirip.</p>
        )}
        <p className="asisten-saran__label">Saran link internal</p>
        {d.linkInternal.length ? (
          <ul>
            {d.linkInternal.map((a) => (
              <li key={a.id}>
                <TautanBaru href={a.urlAdmin}>{a.judul}</TautanBaru> <span className="asisten__redup">({a.path || 'belum punya slug'}, {a.alasan})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada artikel terkait. Pilih pilar artikel dulu supaya saran sepilar muncul.</p>
        )}
        <p className="asisten-saran__label">Sumber resmi wajib dicek{d.pilar ? ` (${d.pilar})` : ''}</p>
        {d.sumberResmi.length ? (
          <ul>
            {d.sumberResmi.map((s) => (
              <li key={s.url}>
                <TautanBaru href={s.url}>{s.nama}</TautanBaru>
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada sumber resmi untuk pilar ini. Admin bisa menambahkannya di Pengaturan, Asisten AI.</p>
        )}
      </div>
      <div className="asisten-saran">
        <h5>Cek manual sebelum menulis</h5>
        <ol>
          {brief.cekManual.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/**
 * Brief dari keyword di sidebar (spesifikasi §10 butir 1). Hasilnya disimpan di field tersembunyi `briefAi`
 * (ikut autosave draf), jadi tetap ada saat artikel dibuka lagi dan dipakai draf per bagian.
 */
export function BagianBrief({ minta, nonaktif }: { minta: Minta; nonaktif: boolean }) {
  const { getData, dispatchFields, setModified } = useForm()
  const tersimpan = briefDari(useFormFields(([f]) => f.briefAi?.value))
  const keyphrase = useFormFields(([f]) => f['seo.keyphrase']?.value)
  const [keyword, setKeyword] = useState<string | null>(null)
  const [keadaan, setKeadaan] = useState<Keadaan>({ tahap: 'awal' })
  const idInput = useId()
  const nilaiKeyword = keyword ?? (typeof keyphrase === 'string' ? keyphrase : '')
  const memuat = keadaan.tahap === 'memuat'

  async function buat() {
    const data = getData() as { id?: number; pilar?: unknown; tipe?: string }
    setKeadaan({ tahap: 'memuat' })
    const jawaban = await minta('brief', { keyword: nilaiKeyword, tipe: data.tipe, pilar: idRelasi(data.pilar), artikel: data.id ?? null })
    if (jawaban.status !== 'berhasil') {
      setKeadaan({ tahap: 'galat', pesan: jawaban.pesan })
      return
    }
    dispatchFields({ type: 'UPDATE', path: 'briefAi', value: jawaban.hasil })
    setModified(true)
    setKeadaan({ tahap: 'hasil' })
  }

  const status =
    keadaan.tahap === 'memuat' ? 'Membuat brief...' : keadaan.tahap === 'hasil' ? 'Brief siap dan tersimpan bersama draf artikel.' : keadaan.tahap === 'galat' ? keadaan.pesan : ''

  return (
    <div className="asisten-bagian">
      <h4>Brief dari keyword</h4>
      <p className="asisten__keterangan">
        Intent, format, outline, dan pertanyaan pembaca dari Claude, ditambah artikel terkait dan sumber resmi dari database point. Claude tidak membuka Google, jadi
        hasil teratas tetap kamu cek sendiri.
      </p>
      <label className="asisten__label" htmlFor={idInput}>
        Keyword
      </label>
      <input id={idInput} className="asisten__input" type="text" value={nilaiKeyword} onChange={(e) => setKeyword(e.target.value)} maxLength={120} />
      <button type="button" className="asisten__tombol" onClick={buat} disabled={nonaktif || memuat || !nilaiKeyword.trim()} aria-busy={memuat}>
        {memuat ? 'Membuat brief...' : tersimpan ? 'Buat ulang brief' : 'Buat brief'}
      </button>
      <p role="status" className={keadaan.tahap === 'galat' ? 'asisten__pesan asisten__pesan--galat' : status ? 'asisten__ringkasan' : 'asisten__sr'}>
        {status}
      </p>
      {tersimpan ? (
        <details className="asisten-rincian" open={keadaan.tahap === 'hasil' || undefined}>
          <summary>Brief untuk &quot;{tersimpan.keyword}&quot;</summary>
          <IsiBrief brief={tersimpan} />
        </details>
      ) : null}
    </div>
  )
}
