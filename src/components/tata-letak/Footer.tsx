import { Logo } from '@/components/dasar/Logo'
import { Tautan } from '@/components/dasar/Tautan'
import type { DataFooter } from '@/modules/konten/tipe'

import gaya from './Footer.module.css'

export function Footer({ data }: { data: DataFooter }) {
  const sosial = data.whatsapp ? [...data.sosial, { label: 'Saluran WhatsApp', href: data.whatsapp }] : data.sosial
  return (
    <footer className={gaya.footer}>
      <div className={`kontainer ${gaya.isi}`}>
        <div className={gaya.merek}>
          <Logo ukuran="kecil" />
          <p className={gaya.tagline}>Intinya dulu.</p>
        </div>
        {data.tautan.length > 0 && (
          <nav aria-label="Tentang point." className={gaya.tautan}>
            <ul className={gaya.daftar}>
              {data.tautan.map((t) => (
                <li key={t.href}>
                  <Tautan href={t.href}>{t.label}</Tautan>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {sosial.length > 0 && (
          <ul aria-label="Ikuti point." className={gaya.daftar}>
            {sosial.map((s) => (
              <li key={s.href}>
                <Tautan href={s.href}>{s.label}</Tautan>
              </li>
            ))}
          </ul>
        )}
        <p className={gaya.hakCipta}>{data.hakCipta}</p>
      </div>
    </footer>
  )
}
