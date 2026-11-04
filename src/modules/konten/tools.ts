import type { Pilar, Tool } from '@/payload-types'
import { pathFor } from '@/lib/paths'

import { pilarRingkas } from './artikel'
import type { ItemTools, KelompokTools } from './tipe'

type ToolsUntukIndeks = Pick<Tool, 'id' | 'nama' | 'slug' | 'ringkasan' | 'pilar'>

/** Tools terbit yang punya slug, sebagai tautan ke kalkulatornya (`/tools/{slug}`, Rencana 5). */
export function itemTools(doc: ToolsUntukIndeks): ItemTools | null {
  if (!doc.slug) return null
  return { id: doc.id, nama: doc.nama, href: pathFor({ jenis: 'tools', slug: doc.slug }), ringkasan: doc.ringkasan }
}

const urutanPilar = (relasi: ToolsUntukIndeks['pilar']) => (typeof relasi === 'object' ? (relasi.urutan ?? 0) : 0)

/**
 * Indeks `/tools`: tools dikelompokkan per pilar dengan urutan pilar dari CMS (sama dengan menu
 * header), dan di dalamnya urut nama. Tools yang pilarnya belum dimuat dilewati.
 */
export function kelompokkanTools(docs: ToolsUntukIndeks[]): KelompokTools[] {
  const kelompok = new Map<string, { urutan: number; pilar: NonNullable<ReturnType<typeof pilarRingkas>>; tools: ItemTools[] }>()
  for (const doc of docs) {
    const pilar = pilarRingkas(doc.pilar as Pilar | number)
    const item = itemTools(doc)
    if (!pilar || !item) continue
    const ada = kelompok.get(pilar.slug) ?? { urutan: urutanPilar(doc.pilar), pilar, tools: [] }
    ada.tools.push(item)
    kelompok.set(pilar.slug, ada)
  }
  return [...kelompok.values()]
    .sort((a, b) => a.urutan - b.urutan || a.pilar.nama.localeCompare(b.pilar.nama, 'id'))
    .map(({ pilar, tools }) => ({ pilar, tools: tools.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })) }))
}
