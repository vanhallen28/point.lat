import { createLocalReq } from 'payload'
import { describe, expect, it } from 'vitest'

import { getTestPayload } from './helpers'

type Terjemahan = { [kunci: string]: Terjemahan | string }

/** Semua kunci `a:b:c` dan nilainya dari objek terjemahan bersarang. */
function rata(objek: Terjemahan, awalan = ''): [string, string][] {
  return Object.entries(objek).flatMap(([k, v]) => (typeof v === 'string' ? [[`${awalan}${k}`, v] as [string, string]] : rata(v, `${awalan}${k}:`)))
}

describe('admin Payload berbahasa Indonesia', () => {
  it('hanya bahasa Indonesia yang didukung, jadi admin selalu berbahasa Indonesia apa pun bahasa browser', async () => {
    const payload = await getTestPayload()
    expect(Object.keys(payload.config.i18n.supportedLanguages)).toEqual(['id'])
    expect(payload.config.i18n.fallbackLanguage).toBe('id')
  })

  it('setiap teks editor Lexical yang terpasang punya terjemahan Indonesia (tanpa kunci mentah di toolbar)', async () => {
    const payload = await getTestPayload()
    const terjemahan = payload.config.i18n.translations as Record<string, Terjemahan>
    const inggris = rata(terjemahan.en.lexical as Terjemahan).map(([k]) => k)
    const indonesia = new Set(rata(terjemahan.id.lexical as Terjemahan).map(([k]) => k))
    expect(inggris.length).toBeGreaterThan(20)
    expect(inggris.filter((k) => !indonesia.has(k))).toEqual([])
  })

  it('teks admin (bawaan dan tambahan) tanpa em dash, en dash, dan tanda seru', async () => {
    const payload = await getTestPayload()
    const bawaan = payload.config.i18n.supportedLanguages.id!.translations as unknown as Terjemahan
    const tambahan = (payload.config.i18n.translations as Record<string, Terjemahan>).id
    const melanggar = [...rata(bawaan), ...rata(tambahan)].filter(([k, v]) => /[\u2014\u2013!]/.test(v) && k !== 'general:sorryNotFound')
    expect(melanggar).toEqual([])
    expect(rata(tambahan).find(([k]) => k === 'general:sorryNotFound')?.[1]).toBe('Maaf, tidak ada yang sesuai dengan permintaan Anda.')
  })

  it('permintaan Local API dan REST memakai teks Indonesia, termasuk editor Lexical dan pesan galat', async () => {
    const payload = await getTestPayload()
    const req = await createLocalReq({}, payload)
    expect(req.i18n.language).toBe('id')
    expect(req.t('general:save')).toBe('Simpan')
    expect(req.t('version:publishChanges')).toBe('Publikasikan perubahan')
    expect(req.t('general:sorryNotFound')).toBe('Maaf, tidak ada yang sesuai dengan permintaan Anda.')
    expect(req.t('lexical:heading:label' as never, { headingLevel: 2 })).toBe('Judul 2')
    await expect(payload.find({ collection: 'log-ai', overrideAccess: false })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
  })
})
