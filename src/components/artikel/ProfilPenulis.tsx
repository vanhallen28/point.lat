import Image from 'next/image'

import { Tautan } from '@/components/dasar/Tautan'
import type { PenulisRingkas } from '@/modules/konten/tipe'
import { propsGambar } from '@/modules/media/props'

import gaya from './Artikel.module.css'

/** Profil penulis di akhir artikel: foto, nama, bio, dan keahlian (rambu kredibilitas, spesifikasi §3). */
export function ProfilPenulis({ penulis, cloudName }: { penulis: PenulisRingkas | null; cloudName: string }) {
  if (!penulis) return null
  const foto = propsGambar(penulis.foto, 'thumbnail', { cloudName, lebar: 144 })
  return (
    <section aria-labelledby="penulis" className={gaya.penulis}>
      {foto && <Image {...foto} alt="" sizes="72px" />}
      <div className={gaya.penulisIsi}>
        <h2 id="penulis" className={gaya.label}>
          Tentang penulis
        </h2>
        <p className={gaya.penulisNama}>
          <Tautan href={penulis.href}>{penulis.nama}</Tautan>
        </p>
        {penulis.bio && <p>{penulis.bio}</p>}
        {penulis.keahlian.length > 0 && (
          <ul className={gaya.keahlian} aria-label="Keahlian">
            {penulis.keahlian.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
