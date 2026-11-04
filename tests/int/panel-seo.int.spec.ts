import config from '@payload-config'
import { handleEndpoints } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { DataPanel } from '@/modules/seo/panel'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

const BASIS = 'http://localhost:3000/api'

async function panel(body: unknown, token?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (token) headers.set('Authorization', `JWT ${token}`)
  const respons = await handleEndpoints({
    config,
    request: new Request(`${BASIS}/artikel/panel-seo`, { method: 'POST', headers, body: JSON.stringify(body) }),
  })
  return { status: respons.status, data: (await respons.json()) as DataPanel & { errors?: { message: string }[] } }
}

describe('endpoint panel SEO', () => {
  let token = ''
  let relasi: Awaited<ReturnType<typeof siapkanRelasiArtikel>>
  let kata = ''
  let sama: { id: number }
  let terkait: { id: number }

  beforeAll(async () => {
    const payload = await getTestPayload()
    const email = `${unik('editor')}@tes.local`
    await payload.create({ collection: 'pengguna', data: { email, password: 'rahasia-123', nama: 'Editor SEO' } })
    token = (await payload.login({ collection: 'pengguna', data: { email, password: 'rahasia-123' } })).token!

    relasi = await siapkanRelasiArtikel(payload)
    kata = unik('zakat').replace(/-/g, '')
    sama = await payload.create({
      collection: 'artikel',
      data: { ...dataArtikelTerbit(relasi), seo: { keyphrase: `${kata} profesi 2025` } },
    })
    terkait = await payload.create({
      collection: 'artikel',
      draft: true,
      data: { judul: unik('Draf terkait'), pilar: relasi.pilar.id, seo: { keyphrase: `hitung ${kata} emas` } },
    })
  })

  it('menolak pengguna yang belum masuk', async () => {
    const { status, data } = await panel({ keyphrase: 'gaji' })
    expect(status).toBe(401)
    expect(data.errors?.[0].message).toBe('Masuk dulu untuk memakai panel SEO.')
  })

  it('kanibalisasi: keyphrase sama (tahun diabaikan) dengan tautan ke artikelnya', async () => {
    const { status, data } = await panel({ keyphrase: `${kata} profesi`, pilar: relasi.pilar.id }, token)
    expect(status).toBe(200)
    expect(data.kanibalisasi).toEqual([
      expect.objectContaining({ id: sama.id, tingkat: 'sama', urlAdmin: `/admin/collections/artikel/${sama.id}` }),
    ])
  })

  it('saran link: artikel sepilar dan berkeyphrase terkait, termasuk draf; dokumen sendiri dan yang sudah ditautkan dilewati', async () => {
    const { data } = await panel({ id: sama.id, keyphrase: `${kata} profesi`, pilar: relasi.pilar.id }, token)
    expect(data.kanibalisasi).toEqual([])
    const ids = data.saran.map((s) => s.id)
    expect(ids[0]).toBe(terkait.id)
    expect(ids).not.toContain(sama.id)
    expect(data.saran[0].alasan).toBe(`keyphrase terkait: ${kata}, sepilar`)

    const lagi = await panel({ id: sama.id, keyphrase: `${kata} profesi`, pilar: relasi.pilar.id, tertaut: [terkait.id] }, token)
    expect(lagi.data.saran.map((s) => s.id)).not.toContain(terkait.id)
  })

  it('mengembalikan pengaturan situs, pilar, dan media untuk pratinjau dan analisis', async () => {
    const { data } = await panel({ pilar: relasi.pilar.id, media: [relasi.gambar.id, 'bukan-id-valid'] }, token)
    expect(data.situs).toMatchObject({ namaSitus: 'point.', urlSitus: 'https://point.lat', polaJudul: '%s · point.', cloudName: 'palsu' })
    expect(data.pilar).toMatchObject({ id: relasi.pilar.id, warna: 'hijau' })
    expect(data.media[String(relasi.gambar.id)]).toMatchObject({ alt: 'Gambar contoh 1600px', width: 1600, height: 900 })
  })
})
