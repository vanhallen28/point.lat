import { describe, expect, it } from 'vitest'

import { responsAdsTxt } from '@/modules/iklan/rute'

describe('/ads.txt', () => {
  it('isi sebagai teks polos dengan cache rute teknis; tanpa baris menjawab 404', async () => {
    const ada = responsAdsTxt('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n')
    expect(ada.status).toBe(200)
    expect(ada.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(ada.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=600')
    expect(await ada.text()).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n')

    const kosong = responsAdsTxt(null)
    expect(kosong.status).toBe(404)
    expect(kosong.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })
})
