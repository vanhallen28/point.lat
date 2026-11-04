import { Logo } from '@/components/dasar/Logo'
import { Tautan } from '@/components/dasar/Tautan'
import type { DataHeader } from '@/modules/konten/tipe'

import gaya from './Header.module.css'

/** Header situs: logo, pill rubrik dengan titik warna pilar, dan tombol Tools hitam (spesifikasi §4). */
export function Header({ data }: { data: DataHeader }) {
  return (
    <header className={gaya.header}>
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
                  <Tautan href={item.href} className={gaya.pil}>
                    {item.warna && <span className={gaya.titik} data-warna={item.warna} aria-hidden="true" />}
                    {item.label}
                  </Tautan>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <Tautan href={data.tools.href} className={gaya.tools}>
          {data.tools.label}
        </Tautan>
      </div>
    </header>
  )
}
