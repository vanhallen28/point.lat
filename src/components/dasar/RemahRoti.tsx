import type { RemahRoti as Remah } from '@/modules/seo/jsonld'

import { Ikon } from './Ikon'
import gaya from './RemahRoti.module.css'
import { Tautan } from './Tautan'

/**
 * Breadcrumb tampil. Datanya dari `remahRoti()` modul SEO, sama dengan schema BreadcrumbList
 * (spesifikasi §8). Item terakhir adalah halaman ini.
 */
export function RemahRoti({ remah }: { remah: Remah[] }) {
  if (remah.length < 2) return null
  return (
    <nav aria-label="Remah roti" className={gaya.remah}>
      <ol>
        {remah.map((r, i) => {
          const terakhir = i === remah.length - 1
          return (
            <li key={r.path}>
              {i > 0 && <Ikon nama="chevron-right" ukuran={16} />}
              {terakhir ? (
                <span aria-current="page" className={gaya.sekarang}>
                  {r.nama}
                </span>
              ) : (
                <Tautan href={r.path}>{r.nama}</Tautan>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
