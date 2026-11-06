'use client'

import { useFormFields } from '@payloadcms/ui'

import { isiAdsTxt } from '../aturan'

import './iklan.scss'

/** Pratinjau `/ads.txt` dari isian form yang sedang diubah (baris AdSense dibuat otomatis dari ID penerbit). */
export function PratinjauAdsTxt() {
  const isi = useFormFields(([fields]) =>
    isiAdsTxt({
      penyedia: 'adsense',
      idPenerbit: typeof fields.idPenerbit?.value === 'string' ? fields.idPenerbit.value : null,
      adsTxtTambahan: typeof fields.adsTxtTambahan?.value === 'string' ? fields.adsTxtTambahan.value : null,
    }),
  )
  return (
    <section className="iklan-adstxt" aria-labelledby="iklan-adstxt-judul">
      <p id="iklan-adstxt-judul" className="iklan-adstxt__judul">
        Isi /ads.txt setelah disimpan
      </p>
      {isi ? <pre>{isi}</pre> : <p>Belum ada baris, jadi /ads.txt menjawab 404. Isi ID penerbit AdSense supaya baris AdSense dibuat otomatis.</p>}
    </section>
  )
}
