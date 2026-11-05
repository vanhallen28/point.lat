import type { ParameterTool, Pilar, Tool } from '@/payload-types'
import { pathFor } from '@/lib/paths'
import { hitung, siapkanKalkulator, type Hasil, type Kalkulator, type ParameterTersimpan } from '@/modules/hitung'
import type { IsiDokumen } from '@/modules/seo/lexical'
import type { ToolsSeo } from '@/modules/seo/tipe'

import { pilarRingkas, tandaiSubjudul } from './artikel'
import type { DataTool, ItemTools, KelompokTools } from './tipe'

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

type ParameterUntukTool = Pick<ParameterTool, 'toolId' | 'kunci' | 'nilai' | 'tabel' | 'berlakuMulai' | 'berlakuSampai' | 'sumber'>

/** Dokumen `parameter-tools` (depth 0) dalam bentuk yang dibaca modul hitung, tanpa id dan cap waktu. */
export function parameterTersimpan(doc: ParameterUntukTool): ParameterTersimpan {
  return {
    toolId: doc.toolId,
    kunci: doc.kunci,
    nilai: doc.nilai ?? null,
    tabel: doc.tabel?.length ? doc.tabel.map((b) => ({ label: b.label ?? null, batas: b.batas ?? null, nilai: b.nilai ?? null })) : null,
    berlakuMulai: doc.berlakuMulai,
    berlakuSampai: doc.berlakuSampai ?? null,
    sumber: { judul: doc.sumber?.judul ?? null, url: doc.sumber?.url ?? null },
  }
}

/** Dokumen tools terbit (depth 2) dan parameternya menjadi data halaman `/tools/{slug}`. */
export function susunTool(doc: Tool, parameter: ParameterUntukTool[]): DataTool {
  const sumber = (doc.sumberAturan ?? []).map((s) => ({
    judul: s.judul,
    url: s.url,
    penerbit: s.penerbit?.trim() || null,
    diaksesPada: s.diaksesPada ?? null,
  }))
  const tanggalAkses = sumber.map((s) => s.diaksesPada).filter((t): t is string => Boolean(t))
  const { id, nama, slug, toolId, ringkasan, pilar, seo, createdAt, updatedAt } = doc
  return {
    id,
    nama,
    toolId,
    href: pathFor({ jenis: 'tools', slug: slug ?? '' }),
    ringkasan,
    pilar: pilarRingkas(pilar as Pilar | number),
    bantuan: Object.fromEntries((doc.bantuanInput ?? []).map((b) => [b.kunci, { label: b.label, bantuan: b.bantuan?.trim() || null }])),
    penjelasan: tandaiSubjudul(doc.penjelasan as IsiDokumen).isi,
    faq: (doc.faq ?? []).map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban })),
    sumber,
    diperiksa: tanggalAkses.length ? tanggalAkses.reduce((a, b) => (a > b ? a : b)) : null,
    parameter: parameter.map(parameterTersimpan),
    seo: { id, slug, nama, toolId, ringkasan, pilar, seo, createdAt, updatedAt } as ToolsSeo,
  }
}

/**
 * Kalkulator untuk satu tanggal: isian (dengan label dan bantuan dari CMS), contoh masukan, parameter
 * yang berlaku, dan hasil untuk contoh itu. Hasil contoh dirender server, jadi halaman sudah berisi
 * angka sebelum JavaScript jalan (`null` bila kalkulator belum bisa dipakai).
 */
export function susunKalkulator(tool: DataTool, tanggal: Date | string): { kalkulator: Kalkulator; contoh: Hasil | null } {
  const kalkulator = siapkanKalkulator(tool.toolId, tool.parameter, tanggal, tool.bantuan)
  if (kalkulator.pesan) return { kalkulator, contoh: null }
  return { kalkulator, contoh: hitung(tool.toolId, kalkulator.contoh, tanggal, tool.parameter, tool.bantuan) }
}
