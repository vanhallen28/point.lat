import config from '@payload-config'
import { handleEndpoints } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adapterPalsu, pakaiAdapterAi } from '@/modules/ai'

import { getTestPayload, unik } from './helpers'

const palsu = adapterPalsu()

async function kirim(token: string, body: unknown) {
  const respons = await handleEndpoints({
    config,
    request: new Request('http://localhost:3000/api/artikel/asisten', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', Authorization: `JWT ${token}` }),
      body: JSON.stringify(body),
    }),
  })
  return { status: respons.status, data: (await respons.json()) as Record<string, unknown> }
}

describe('draf per bagian lewat endpoint asisten', () => {
  beforeAll(() => pakaiAdapterAi(palsu))
  afterAll(() => pakaiAdapterAi(null))

  it('satu H2 per permintaan dengan model draf bawaan; subjudul tetap yang diminta; log mencatat subjudulnya', async () => {
    const payload = await getTestPayload()
    const email = `${unik('draf')}@tes.local`
    const editor = await payload.create({ collection: 'pengguna', data: { email, password: 'rahasia-123', nama: 'Penulis' } })
    const { token } = await payload.login({ collection: 'pengguna', data: { email, password: 'rahasia-123' } })
    const artikel = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf THR'), _status: 'draft' } })

    const { status, data } = await kirim(token!, {
      tugas: 'draf',
      dokumen: artikel.id,
      masukan: { judul: artikel.judul, keyphrase: 'hitung thr', h2: 'Rumus THR karyawan tetap', poin: ['Masa kerja'], outline: [], catatan: 'Masa kerja 12 bulan.' },
    })
    expect(status).toBe(200)
    expect(data).toMatchObject({ status: 'berhasil', tugas: 'draf', model: 'claude-sonnet-5-5', hasil: { h2: 'Rumus THR karyawan tetap', catatan: ['1 em dash atau en dash diganti koma atau tanda hubung.'] } })
    expect((data.hasil as { blok: { teks: string }[] }).blok[0].teks).toBe('Paragraf contoh dari adapter palsu, bukan tulisan Claude.')
    expect(palsu.permintaan.at(-1)).toMatchObject({ tugas: 'draf', maksToken: 8_000, effort: 'medium' })
    expect(palsu.permintaan.at(-1)?.pesan).toContain('<catatan_penulis>\nMasa kerja 12 bulan.\n</catatan_penulis>')

    const [log] = (await payload.find({ collection: 'log-ai', where: { pengguna: { equals: editor.id } }, depth: 0 })).docs
    expect(log).toMatchObject({ tugas: 'draf', status: 'berhasil', dokumen: artikel.id, ringkasan: 'Rumus THR karyawan tetap' })

    expect(await kirim(token!, { tugas: 'draf', masukan: { h2: '' } })).toMatchObject({ status: 400, data: { pesan: 'Isi subjudul (H2) bagian yang mau ditulis dulu.' } })
  })
})
