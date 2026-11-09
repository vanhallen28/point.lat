import { Logo } from '@/components/dasar/Logo'
import { Tautan } from '@/components/dasar/Tautan'
import type { DataHeader } from '@/modules/konten/tipe'

import gaya from './Header.module.css'
import { ID_TANGGAL, skripTanggal } from './tanggal'
import { TautanAktif } from './TautanAktif'

/**
 * Header situs: baris atas berisi tanggal hari ini (skrip sebaris `skripTanggal`) dan "Topik hangat" (subkategori tulisan terbaru, spesifikasi
 * §25), lalu logo, pill rubrik dengan titik warna pilar, dan tombol Tools hitam (spesifikasi §4). Pill dan tombol
 * Tools menandai bagian yang sedang dibuka (`aria-current`).
 */
export function Header({ data }: { data: DataHeader }) {
  return (
    <header className={gaya.header}>
      <div className={gaya.atas}>
        <div className={`kontainer ${gaya.atasIsi}`}>
          <p id={ID_TANGGAL} className={gaya.tanggal} suppressHydrationWarning />
          <script dangerouslySetInnerHTML={{ __html: skripTanggal() }} />
          {data.topik.length > 0 && (
            <nav aria-label="Topik hangat" className={gaya.topik}>
              <span className={gaya.topikLabel} aria-hidden="true">
                Topik hangat
              </span>
              <ul className={gaya.topikDaftar}>
                {data.topik.map((t) => (
                  <li key={t.href}>
                    <TautanAktif href={t.href} className={gaya.topikTautan}>
                      {t.label}
                    </TautanAktif>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
      <div className={`kontainer ${gaya.baris}`}>
        <Tautan href="/" className={gaya.logo}>
          <Logo />
          <span className="sr">, ke beranda</span>
        </Tautan>
        {data.menu.length > 0 && (
          <nav aria-label="Rubrik" className={gaya.nav}>
            <ul className={gaya.daftar}>
              {data.menu.map((item) => (
                <li key={item.href}>
                  <TautanAktif href={item.href} className={gaya.pil}>
                    {item.warna && <span className={gaya.titik} data-warna={item.warna} aria-hidden="true" />}
                    {item.label}
                  </TautanAktif>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <TautanAktif href={data.tools.href} className={gaya.tools}>
          {data.tools.label}
        </TautanAktif>
      </div>
    </header>
  )
}
