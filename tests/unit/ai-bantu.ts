/**
 * Pemeriksa skema keluaran untuk tes prompt AI. Bukan file tes (tidak berakhiran `.test.ts`).
 * Batasan structured outputs dari dokumentasi Claude (dibaca 5 November 2026): setiap objek wajib
 * `additionalProperties: false`, tanpa batasan angka (`minimum`, `maximum`, `multipleOf`), tanpa batasan
 * panjang teks (`minLength`, `maxLength`), dan tanpa batasan jumlah item selain `minItems` 0 atau 1. Rencana
 * ini juga mewajibkan semua properti di `required` (batas 24 properti opsional per permintaan).
 */
const DILARANG = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'maxItems', 'uniqueItems']

export function masalahSkema(skema: unknown, letak = '$'): string[] {
  if (!skema || typeof skema !== 'object') return []
  const s = skema as Record<string, unknown>
  const masalah: string[] = []
  for (const kunci of DILARANG) if (kunci in s) masalah.push(`${letak}: ${kunci} tidak didukung`)
  if (typeof s.minItems === 'number' && s.minItems > 1) masalah.push(`${letak}: minItems ${s.minItems} tidak didukung`)
  if (s.type === 'object') {
    const properti = (s.properties ?? {}) as Record<string, unknown>
    if (s.additionalProperties !== false) masalah.push(`${letak}: additionalProperties harus false`)
    const wajib = new Set((s.required as string[] | undefined) ?? [])
    for (const nama of Object.keys(properti)) {
      if (!wajib.has(nama)) masalah.push(`${letak}.${nama}: harus ada di required`)
      masalah.push(...masalahSkema(properti[nama], `${letak}.${nama}`))
    }
  }
  if (s.type === 'array') masalah.push(...masalahSkema(s.items, `${letak}[]`))
  return masalah
}

/** Em dash, en dash, dan tanda seru di teks prompt (aturan copy point.). */
export const tandaTerlarang = (teks: string) => [...teks].filter((c) => c === '\u2013' || c === '\u2014' || c === '!')
