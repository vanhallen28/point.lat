import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { hrefDokumen } from '@/modules/konten/isi'
import type { Tool } from '@/payload-types'

import gaya from './Isi.module.css'

/** Blok "embed tool": ajakan ke kalkulator. Kalkulator sendiri ada di halaman tools (Rencana 5). */
export function KartuTool({ tool }: { tool: number | Pick<Tool, 'nama' | 'slug' | 'ringkasan' | '_status'> }) {
  const href = hrefDokumen('tools', tool)
  if (!href || typeof tool !== 'object') return null
  return (
    <Tautan href={href} className={gaya.kartuTool}>
      <Ikon nama="calculator" ukuran={28} />
      <span>
        <strong>{tool.nama}</strong>
        {tool.ringkasan}
      </span>
      <span className={gaya.ajakan}>
        Hitung {tool.nama}
        <Ikon nama="arrow-right" />
      </span>
    </Tautan>
  )
}
