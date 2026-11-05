import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adapterPalsu, jalankan } from '@/modules/ai'
import type { HasilBrief } from '@/modules/ai/prompt/brief'
import { PILAR_AWAL, seed } from '@/seed/seed'
import { SUMBER_RESMI_AWAL } from '@/seed/sumber-resmi'

import { siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

const palsu = adapterPalsu()
const ADAPTER = { mode: 'palsu' as const, adapter: palsu }

async function editor(payload: Payload) {
  return payload.create({ collection: 'pengguna', data: { email: `${unik('brief')}@tes.local`, password: 'rahasia-123', nama: 'Editor', peran: 'editor' } })
}

describe('brief dari keyword', () => {
  let sumberLama: unknown
  beforeAll(async () => {
    sumberLama = (await (await getTestPayload()).findGlobal({ slug: 'asisten-ai', depth: 0 })).sumberResmi
  })
  afterAll(async () => {
    await (await getTestPayload()).updateGlobal({ slug: 'asisten-ai', data: { sumberResmi: sumberLama as never } })
  })

  it('seed mengisi sumber resmi per pilar hanya bila daftarnya kosong; daftar milik pemilik tidak ditimpa', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'asisten-ai', data: { sumberResmi: [] } })
    await seed(payload)
    await seed(payload)
    const global = await payload.findGlobal({ slug: 'asisten-ai', depth: 1 })
    const jumlah = PILAR_AWAL.reduce((n, p) => n + (SUMBER_RESMI_AWAL[p.slug]?.length ?? 0), 0)
    expect(global.sumberResmi).toHaveLength(jumlah)
    const uang = global.sumberResmi?.filter((s) => typeof s.pilar === 'object' && s.pilar.slug === 'uang-karier').map((s) => s.nama)
    expect(uang).toEqual(SUMBER_RESMI_AWAL['uang-karier'].map((s) => s.nama))

    const pilarUang = global.sumberResmi?.[0].pilar
    await payload.updateGlobal({ slug: 'asisten-ai', data: { sumberResmi: [{ pilar: typeof pilarUang === 'object' ? pilarUang.id : (pilarUang as number), nama: 'Sumber pemilik', url: 'https://contoh.go.id' }] } })
    await seed(payload)
    expect((await payload.findGlobal({ slug: 'asisten-ai', depth: 0 })).sumberResmi?.map((s) => s.nama)).toEqual(['Sumber pemilik'])
  })

  it('brief: perkiraan Claude dari model brief bawaan, ditambah kanibalisasi, saran link internal sepilar, dan sumber resmi pilar dari database', async () => {
    const payload = await getTestPayload()
    const { pilar } = await siapkanRelasiArtikel(payload)
    const kata = unik('lembur').replace(/-/g, '')
    const sama = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Hitung lembur'), pilar: pilar.id, _status: 'draft', seo: { keyphrase: `hitung ${kata}` } } })
    const terkait = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Aturan lembur'), pilar: pilar.id, _status: 'draft', seo: { keyphrase: `aturan ${kata} karyawan` } } })
    const ini = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf brief'), pilar: pilar.id, _status: 'draft', seo: { keyphrase: `hitung ${kata}` } } })
    await payload.updateGlobal({ slug: 'asisten-ai', data: { sumberResmi: [{ pilar: pilar.id, nama: 'Kementerian Ketenagakerjaan', url: 'https://kemnaker.go.id' }] } })

    const hasil = await jalankan(payload, 'brief', { keyword: `hitung ${kata}`, tipe: 'explainer', pilar: pilar.id, artikel: ini.id }, { pengguna: await editor(payload), dokumen: ini.id, adapter: ADAPTER })
    if (hasil.status !== 'berhasil') throw new Error(hasil.pesan)
    expect(hasil.model).toBe('claude-sonnet-5-5')
    expect(palsu.permintaan.at(-1)).toMatchObject({ tugas: 'brief', maksToken: 8_000, effort: 'medium' })
    expect(palsu.permintaan.at(-1)?.pesan).toContain(`- ${terkait.judul}`)

    const brief = hasil.hasil as HasilBrief
    expect(brief.keyword).toBe(`hitung ${kata}`)
    expect(brief.dariPoint.pilar).toBe(pilar.nama)
    expect(brief.dariPoint.kanibalisasi).toEqual([{ id: sama.id, judul: sama.judul, keyphrase: `hitung ${kata}`, tingkat: 'sama', urlAdmin: `/admin/collections/artikel/${sama.id}` }])
    expect(brief.dariPoint.linkInternal[0]).toMatchObject({ id: terkait.id, judul: terkait.judul, urlAdmin: `/admin/collections/artikel/${terkait.id}` })
    expect(brief.dariPoint.linkInternal.map((a) => a.id)).not.toContain(ini.id)
    expect(brief.dariPoint.sumberResmi).toEqual([{ nama: 'Kementerian Ketenagakerjaan', url: 'https://kemnaker.go.id' }])
    expect(brief.dariPoint.panjangAcuan).toBe('1.500 sampai 2.500 kata')
    expect(brief.catatan).toContain('Keyword ini sudah dipakai artikel lain. Bedakan sudutnya, atau gabungkan ke artikel yang sudah ada.')

    const [log] = (await payload.find({ collection: 'log-ai', where: { dokumen: { equals: ini.id } }, depth: 0 })).docs
    expect(log).toMatchObject({ tugas: 'brief', status: 'berhasil', ringkasan: `hitung ${kata}`, model: 'claude-sonnet-5-5' })
  })

  it('brief tanpa keyword ditolak sebelum memanggil Claude', async () => {
    const payload = await getTestPayload()
    palsu.reset()
    expect(await jalankan(payload, 'brief', { keyword: '' }, { pengguna: await editor(payload), adapter: ADAPTER })).toMatchObject({
      status: 'gagal',
      alasan: 'masukan',
      pesan: 'Isi keyword dulu, lalu buat brief.',
    })
    expect(palsu.permintaan).toEqual([])
  })
})
