import { Ikon } from '@/components/dasar/Ikon'
import { tautanBagikan } from '@/lib/bagikan'

import gaya from './Bagikan.module.css'
import { SalinTautan } from './SalinTautan'

/**
 * Tombol bagikan di akhir artikel (spesifikasi §23, saklar Tombol bagikan di Pengaturan, Fitur): tautan biasa ke
 * WhatsApp, Telegram, X, dan Facebook (tab baru, tanpa skrip pihak ketiga), ditambah Salin tautan.
 */
export function TombolBagikan({ url, judul }: { url: string; judul: string }) {
  return (
    <section aria-labelledby="bagikan-judul" className={gaya.bagikan}>
      <h2 id="bagikan-judul" className={gaya.judul}>
        Bagikan tulisan ini
      </h2>
      <ul className={gaya.daftar}>
        {tautanBagikan(url, judul).map((t) => (
          <li key={t.layanan}>
            <a className={gaya.tombol} href={t.href} target="_blank" rel="noopener noreferrer">
              {t.nama}
              <span className="sr"> (tab baru)</span>
              <Ikon nama="arrow-up-right" ukuran={16} />
            </a>
          </li>
        ))}
        <li>
          <SalinTautan url={url} kelas={gaya.tombol} />
        </li>
      </ul>
    </section>
  )
}
