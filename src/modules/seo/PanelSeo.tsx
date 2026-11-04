'use client'

import { useAllFormFields, useConfig, useDebounce, useDocumentInfo } from '@payloadcms/ui'
import { formatAdminURL, reduceFieldsToValues } from 'payload/shared'
import { useEffect, useMemo, useState } from 'react'

import { skor } from './analisis'
import { hasilPanel, masukanPanel, rapikanIsian, type DataPanel } from './panel'

import './PanelSeo.scss'

type Status = { tahap: 'memuat' } | { tahap: 'siap'; data: DataPanel } | { tahap: 'galat'; pesan: string }

const JEDA_MS = 800

/**
 * Panel SEO di tab SEO editor artikel (spesifikasi §8): checklist dari `seo.analisis`, peringatan
 * kanibalisasi, saran link internal, pratinjau hasil Google (desktop dan HP) dan kartu sosial.
 * Data server (artikel lain, media, pengaturan situs) diambil dari `POST /api/artikel/panel-seo`
 * setiap isian berhenti berubah selama 0,8 detik.
 */
export function PanelSeo() {
  const [fields] = useAllFormFields()
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()

  const isian = useMemo(() => ({ ...rapikanIsian(reduceFieldsToValues(fields, true)), id }), [fields, id])
  const masukan = useDebounce(JSON.stringify(masukanPanel(isian)), JEDA_MS)
  const [status, setStatus] = useState<Status>({ tahap: 'memuat' })

  useEffect(() => {
    const kendali = new AbortController()
    fetch(formatAdminURL({ apiRoute: api, path: '/artikel/panel-seo', serverURL }), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: masukan,
      signal: kendali.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`)
        setStatus({ tahap: 'siap', data: (await r.json()) as DataPanel })
      })
      .catch((galat: Error) => {
        if (galat.name !== 'AbortError') setStatus({ tahap: 'galat', pesan: 'Data panel SEO gagal dimuat. Simpan dulu atau muat ulang halaman.' })
      })
    return () => kendali.abort()
  }, [api, serverURL, masukan])

  if (status.tahap === 'memuat') return <div className="panel-seo">Memuat panel SEO...</div>
  if (status.tahap === 'galat') return <div className="panel-seo panel-seo__galat">{status.pesan}</div>

  const { data } = status
  const hasil = hasilPanel(isian, data)
  const nilai = skor(hasil.cek)

  return (
    <div className="panel-seo">
      <section className="panel-seo__bagian">
        <h3>
          Checklist SEO <span className="panel-seo__skor">{nilai.hijau} dari {nilai.total} sudah sesuai</span>
        </h3>
        <p className="panel-seo__catatan">Kuning berarti perlu dilihat. Tidak ada yang menghalangi terbit.</p>
        <ul className="panel-seo__cek">
          {hasil.cek.map((c) => (
            <li key={c.id} className={`panel-seo__cek-${c.status}`}>
              <span className="panel-seo__titik" aria-hidden="true" />
              <strong>{c.label}</strong>
              <span className="panel-seo__status">{c.status === 'hijau' ? 'Sesuai' : 'Perlu dilihat'}</span>
              <span>{c.pesan}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-seo__bagian">
        <h3>Kanibalisasi keyphrase</h3>
        {data.kanibalisasi.length === 0 ? (
          <p>Belum ada artikel lain dengan keyphrase yang sama atau sangat mirip.</p>
        ) : (
          <ul className="panel-seo__daftar">
            {data.kanibalisasi.map((a) => (
              <li key={a.id}>
                <span className="panel-seo__label-kuning">{a.tingkat === 'sama' ? 'Sama' : 'Sangat mirip'}</span>{' '}
                <a href={a.urlAdmin} target="_blank" rel="noreferrer">
                  {a.judul}
                </a>{' '}
                memakai keyphrase &quot;{a.keyphrase}&quot;. Gabungkan, atau bedakan sudut bahasannya.
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-seo__bagian">
        <h3>Saran link internal</h3>
        {data.saran.length === 0 ? (
          <p>Belum ada saran. Isi pilar dan keyphrase dulu.</p>
        ) : (
          <ul className="panel-seo__daftar">
            {data.saran.map((s) => (
              <li key={s.id}>
                <a href={s.urlAdmin} target="_blank" rel="noreferrer">
                  {s.judul}
                </a>{' '}
                <span className="panel-seo__redup">
                  {s.path || 'belum punya slug'}, {s.alasan}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-seo__bagian">
        <h3>Pratinjau hasil Google</h3>
        <div className="panel-seo__google-wadah">
          {(['desktop', 'hp'] as const).map((perangkat) => {
            const t = hasil.pratinjau[perangkat]
            return (
              <figure key={perangkat} className={`panel-seo__google panel-seo__google-${perangkat}`}>
                <figcaption>{perangkat === 'desktop' ? 'Desktop' : 'HP'}</figcaption>
                <div className="panel-seo__google-situs">{data.situs.namaSitus}</div>
                <div className="panel-seo__google-url">{t.url}</div>
                <div className="panel-seo__google-judul">{t.judul}</div>
                <div className="panel-seo__google-deskripsi">{t.deskripsi}</div>
              </figure>
            )
          })}
        </div>
        {hasil.noindex ? <p className="panel-seo__label-kuning">Halaman ini noindex: tidak akan tampil di Google.</p> : null}
        <p className="panel-seo__redup">Canonical: {hasil.canonical}</p>
      </section>

      <section className="panel-seo__bagian">
        <h3>Kartu sosial (WhatsApp, Facebook, X)</h3>
        <figure className="panel-seo__kartu">
          {/* Pratinjau admin memakai <img> biasa: URL Cloudinary sudah berukuran tetap 1200x630. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hasil.gambarOg.url} alt={hasil.gambarOg.alt} width={hasil.gambarOg.width} height={hasil.gambarOg.height} />
          <figcaption>
            <span className="panel-seo__redup">{hasil.pratinjau.sosial.url}</span>
            <strong>{hasil.pratinjau.sosial.judul}</strong>
            <span>{hasil.pratinjau.sosial.deskripsi}</span>
          </figcaption>
        </figure>
      </section>
    </div>
  )
}
