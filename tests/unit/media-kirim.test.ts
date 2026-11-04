import { describe, expect, it } from 'vitest'

import { kirimKeCloudinary, pesanDariRespons } from '@/modules/media/kirim'

const persiapan = {
  urlUnggah: 'https://api.cloudinary.com/v1_1/demo/image/upload',
  field: { public_id: 'point/gambar/a-1', timestamp: '1', signature: 'abc', api_key: 'k' },
}

type Panggilan = { url: string; body: FormData; headers: Record<string, string> }

function fetchPalsu(jawab: (p: Panggilan, ke: number) => Response) {
  const panggilan: Panggilan[] = []
  const fn = (async (url: string, init: RequestInit) => {
    const p = { url, body: init.body as FormData, headers: (init.headers ?? {}) as Record<string, string> }
    panggilan.push(p)
    return jawab(p, panggilan.length)
  }) as unknown as typeof fetch
  return { fn, panggilan }
}

const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 })

describe('kirimKeCloudinary', () => {
  it('mengirim file kecil sekali jalan dengan semua field bertanda tangan', async () => {
    const { fn, panggilan } = fetchPalsu(() => ok({ public_id: 'point/gambar/a-1', version: 2 }))
    const hasil = await kirimKeCloudinary(new Blob(['isi'], { type: 'image/png' }), persiapan, { fetch: fn })

    expect(hasil).toEqual({ public_id: 'point/gambar/a-1', version: 2 })
    expect(panggilan).toHaveLength(1)
    expect(panggilan[0]?.url).toBe(persiapan.urlUnggah)
    const body = panggilan[0]!.body
    for (const [k, v] of Object.entries(persiapan.field)) expect(body.get(k)).toBe(v)
    expect(body.get('file')).toBeInstanceOf(Blob)
  })

  it('memecah file besar menjadi chunk dengan X-Unique-Upload-Id dan Content-Range', async () => {
    const { fn, panggilan } = fetchPalsu((_p, ke) =>
      ok(ke < 3 ? { done: false } : { public_id: 'point/gambar/a-1', version: 3, done: true }),
    )
    const berkas = new Blob([new Uint8Array(25)], { type: 'video/mp4' })
    const hasil = await kirimKeCloudinary(berkas, persiapan, { fetch: fn, ambangChunk: 10, ukuranChunk: 10 })

    expect(hasil).toMatchObject({ public_id: 'point/gambar/a-1', done: true })
    expect(panggilan.map((p) => p.headers['Content-Range'])).toEqual([
      'bytes 0-9/25',
      'bytes 10-19/25',
      'bytes 20-24/25',
    ])
    const id = panggilan[0]?.headers['X-Unique-Upload-Id']
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(panggilan.every((p) => p.headers['X-Unique-Upload-Id'] === id)).toBe(true)
  })

  it('menerjemahkan penolakan Cloudinary menjadi pesan berbahasa Indonesia', async () => {
    const { fn } = fetchPalsu(() => new Response(JSON.stringify({ error: { message: 'Invalid Signature' } }), { status: 401 }))
    await expect(kirimKeCloudinary(new Blob(['x']), persiapan, { fetch: fn })).rejects.toThrow(
      'Cloudinary menolak file (Invalid Signature). Coba unggah ulang.',
    )
  })

  it('melaporkan koneksi putus dan public_id yang tidak sesuai', async () => {
    const putus = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(kirimKeCloudinary(new Blob(['x']), persiapan, { fetch: putus })).rejects.toThrow(
      'Koneksi ke Cloudinary terputus. Periksa internet lalu simpan ulang.',
    )

    const { fn } = fetchPalsu(() => ok({ public_id: 'point/gambar/lain' }))
    await expect(kirimKeCloudinary(new Blob(['x']), persiapan, { fetch: fn })).rejects.toThrow(
      'Cloudinary mengembalikan file yang berbeda. Coba unggah ulang.',
    )
  })
})

describe('pesanDariRespons', () => {
  it('membaca pesan galat Payload dan Cloudinary', () => {
    expect(pesanDariRespons({ errors: [{ message: 'Satu' }, { message: 'Dua' }] })).toBe('Satu Dua')
    expect(pesanDariRespons({ error: { message: 'Format salah' } })).toBe('Format salah')
    expect(pesanDariRespons(null)).toBeUndefined()
  })
})
