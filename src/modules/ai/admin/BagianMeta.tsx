'use client'

import { useForm, useFormFields } from '@payloadcms/ui'
import { useState, type ReactNode } from 'react'

import type { HasilMeta } from '../prompt/meta'
import { teksPolos, type IsianAsisten } from '../teks'

import type { Minta } from './AsistenAi'
import { TombolSalin } from './TombolSalin'
import { useTerapkan, type Batalkan } from './terapkan'

type Keadaan = { tahap: 'awal' } | { tahap: 'memuat' } | { tahap: 'hasil'; hasil: HasilMeta } | { tahap: 'galat'; pesan: string }

type IsianForm = IsianAsisten & { seo?: { keyphrase?: string | null } | null }

const adaIsi = (v: unknown) => typeof v === 'string' && v.trim() !== ''

/** Teks status untuk pembaca layar (`role="status"`), sesuai keadaan. */
function teksStatus(k: Keadaan): string {
  if (k.tahap === 'memuat') return 'Membuat saran meta...'
  if (k.tahap === 'hasil') return 'Saran meta siap. Pilih isian yang mau kamu pakai.'
  if (k.tahap === 'galat') return k.pesan
  return ''
}

type PropsSaran = {
  label: string
  isi: ReactNode
  tombol: string
  keterangan?: string
  diterapkan: boolean
  onPakai: () => void
  onBatal: () => void
}

/**
 * Satu saran dengan satu tombol: "Pakai" atau "Ganti", lalu "Batalkan" setelah diterapkan. Tombolnya
 * elemen yang sama di kedua keadaan, jadi fokus keyboard tidak hilang saat labelnya berganti.
 */
function Saran({ label, isi, tombol, keterangan, diterapkan, onPakai, onBatal }: PropsSaran) {
  return (
    <div className="asisten-saran">
      <p className="asisten-saran__label">{label}</p>
      <div className="asisten-saran__isi">{isi}</div>
      {keterangan ? <p className="asisten__catatan">{keterangan}</p> : null}
      <p className="asisten-saran__aksi">
        <button
          type="button"
          className="asisten__tombol asisten__tombol--kecil"
          onClick={diterapkan ? onBatal : onPakai}
          aria-label={diterapkan ? `Batalkan ${label}` : undefined}
        >
          {diterapkan ? 'Batalkan' : tombol}
        </button>{' '}
        <span role="status">{diterapkan ? 'Diterapkan.' : ''}</span>
      </p>
    </div>
  )
}

/**
 * Generator meta di sidebar (spesifikasi §10 butir 3). Setiap saran punya tombol sendiri: tidak ada isian
 * yang ditimpa tanpa ditekan editor, dan setiap penerapan bisa dibatalkan. Menerapkan Intinya atau FAQ
 * menandai artikel memakai draf AI.
 */
export function BagianMeta({ minta, nonaktif }: { minta: Minta; nonaktif: boolean }) {
  const { getData } = useForm()
  const terapkan = useTerapkan()
  const [keadaan, setKeadaan] = useState<Keadaan>({ tahap: 'awal' })
  const [batal, setBatal] = useState<Record<string, Batalkan>>({})
  // Isian yang sudah terisi menentukan label tombol ("Pakai" atau "Ganti"). Selector mengembalikan teks
  // supaya bagian ini hanya dirender ulang saat salah satunya berubah, bukan di setiap ketikan.
  const [judulTerisi, metaTerisi, intinyaTerisi] = useFormFields(([f]) =>
    [adaIsi(f['seo.judulSEO']?.value), adaIsi(f['seo.metaDeskripsi']?.value), Number(f.intinya?.value) > 0].join(','),
  )
    .split(',')
    .map((v) => v === 'true')

  async function buat() {
    const data = getData() as IsianForm
    setBatal({})
    setKeadaan({ tahap: 'memuat' })
    const jawaban = await minta('meta', { judul: data.judul ?? '', keyphrase: data.seo?.keyphrase ?? '', teks: teksPolos(data) })
    setKeadaan(jawaban.status === 'berhasil' ? { tahap: 'hasil', hasil: jawaban.hasil as HasilMeta } : { tahap: 'galat', pesan: jawaban.pesan })
  }

  const props = (kunci: string, aksi: () => Batalkan) => ({
    diterapkan: Boolean(batal[kunci]),
    onPakai: () => setBatal((b) => ({ ...b, [kunci]: aksi() })),
    onBatal: () => {
      batal[kunci]?.()
      setBatal(({ [kunci]: _, ...sisa }) => sisa)
    },
  })

  const hasil = keadaan.tahap === 'hasil' ? keadaan.hasil : null
  const memuat = keadaan.tahap === 'memuat'
  const TANDA_DRAF = 'Menandai artikel memakai draf AI: checklist review wajib sebelum terbit.'

  return (
    <div className="asisten-bagian">
      <h4>Saran meta</h4>
      <p className="asisten__keterangan">Judul SEO, meta description, slug, alt gambar, Intinya, dan FAQ dari isi artikel. Kamu yang memilih mana yang dipakai.</p>
      <button type="button" className="asisten__tombol" onClick={buat} disabled={nonaktif || memuat} aria-busy={memuat}>
        {memuat ? 'Membuat saran meta...' : hasil ? 'Buat ulang saran meta' : 'Buat saran meta'}
      </button>
      <p role="status" className={keadaan.tahap === 'galat' ? 'asisten__pesan asisten__pesan--galat' : 'asisten__sr'}>
        {teksStatus(keadaan)}
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
          <Saran
            label="Judul SEO"
            isi={<p>{hasil.judulSeo} <span className="asisten__redup">({hasil.judulSeo.length} karakter)</span></p>}
            tombol={judulTerisi ? 'Ganti judul SEO' : 'Pakai judul SEO ini'}
            {...props('judul', () => terapkan.teks('seo.judulSEO', hasil.judulSeo))}
          />
          <Saran
            label="Meta description"
            isi={<p>{hasil.metaDeskripsi} <span className="asisten__redup">({hasil.metaDeskripsi.length} karakter)</span></p>}
            tombol={metaTerisi ? 'Ganti meta description' : 'Pakai meta description ini'}
            {...props('meta', () => terapkan.teks('seo.metaDeskripsi', hasil.metaDeskripsi))}
          />
          <Saran
            label="Slug"
            isi={<p>{hasil.slug}</p>}
            tombol="Ganti slug"
            keterangan="Mengganti slug artikel yang sudah terbit membuat redirect 301 dari alamat lama."
            {...props('slug', () => terapkan.teks('slug', hasil.slug))}
          />
          <Saran
            label="Intinya"
            isi={
              <ul>
                {hasil.intinya.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            }
            tombol={intinyaTerisi ? 'Ganti poin Intinya' : 'Pakai sebagai Intinya'}
            keterangan={TANDA_DRAF}
            {...props('intinya', () => {
              terapkan.tandaiDrafAi()
              return terapkan.gantiBaris('intinya', hasil.intinya.map((poin) => ({ poin })))
            })}
          />
          <Saran
            label="FAQ"
            isi={
              <dl>
                {hasil.faq.map((f) => (
                  <div key={f.pertanyaan}>
                    <dt>{f.pertanyaan}</dt>
                    <dd>{f.jawaban}</dd>
                  </div>
                ))}
              </dl>
            }
            tombol="Tambahkan ke FAQ"
            keterangan={TANDA_DRAF}
            {...props('faq', () => {
              terapkan.tandaiDrafAi()
              return terapkan.tambahBaris('faq', hasil.faq.map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban })))
            })}
          />
          <div className="asisten-saran">
            <p className="asisten-saran__label">Alt gambar utama</p>
            <p>{hasil.altGambarUtama}</p>
            <p className="asisten__catatan">Saran dari isi tulisan, bukan dari melihat gambarnya. Cocokkan dengan gambarnya, lalu tempel di Teks alternatif gambar di Media.</p>
            <TombolSalin teks={hasil.altGambarUtama} label="Salin alt" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
