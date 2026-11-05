import { describe, expect, it } from 'vitest'

import { adapterDariEnv, type PermintaanClaude } from '@/modules/ai/adapter'
import { adapterAsli, URL_MESSAGES, VERSI_API } from '@/modules/ai/asli'
import { adapterPalsu, CONTOH_PALSU, PEMICU_GALAT_PALSU } from '@/modules/ai/palsu'
import type { Fetch } from '@/modules/indexer/google'

const KUNCI = 'kunci-uji-bukan-kunci-asli'

const PERMINTAAN: PermintaanClaude = {
  tugas: 'meta',
  model: 'claude-haiku-5-5',
  sistem: 'Kamu editor point.',
  pesan: '<artikel>Isi.</artikel>',
  skema: { type: 'object', properties: { judulSeo: { type: 'string' } }, required: ['judulSeo'], additionalProperties: false },
  maksToken: 4_000,
  effort: 'low',
}

type Dicatat = { url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> }

/** `fetch` tiruan: mencatat permintaan dan menjawab dari daftar, berurutan. */
function fetchTiruan(...jawaban: (Response | Error)[]) {
  const dicatat: Dicatat[] = []
  const ambil: Fetch = async (input, init) => {
    dicatat.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    })
    const berikut = jawaban.shift()
    if (!berikut) throw new Error('jawaban tiruan habis')
    if (berikut instanceof Error) throw berikut
    return berikut
  }
  return { ambil, dicatat }
}

const json = (status: number, data: unknown, header: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_uji', ...header } })

const pesan = (teks: string, stop = 'end_turn', usage: Record<string, number> = { input_tokens: 120, output_tokens: 80 }) => ({
  id: 'msg_uji',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: teks }],
  stop_reason: stop,
  stop_sequence: null,
  usage,
})

const galatApi = (type: string, message: string) => ({ type: 'error', error: { type, message }, request_id: 'req_uji' })

function asli(...jawaban: (Response | Error)[]) {
  const t = fetchTiruan(...jawaban)
  const ditunggu: number[] = []
  const adapter = adapterAsli({ kunci: KUNCI, fetch: t.ambil, tunggu: async (ms) => void ditunggu.push(ms) })
  return { adapter, dicatat: t.dicatat, ditunggu }
}

describe('saklar AI_ADAPTER', () => {
  it('asli butuh ANTHROPIC_API_KEY; palsu atau kosong di dev memakai palsu; kosong di produksi ditolak dengan pesan', () => {
    expect(adapterDariEnv({ AI_ADAPTER: 'asli', ANTHROPIC_API_KEY: KUNCI })).toMatchObject({ mode: 'asli' })
    expect(adapterDariEnv({ AI_ADAPTER: 'asli', ANTHROPIC_API_KEY: ' ' })).toEqual({ mode: null, pesan: 'ANTHROPIC_API_KEY belum diisi di env server.' })
    expect(adapterDariEnv({ AI_ADAPTER: 'palsu', NODE_ENV: 'production' })).toMatchObject({ mode: 'palsu' })
    expect(adapterDariEnv({ NODE_ENV: 'development' })).toMatchObject({ mode: 'palsu' })
    expect(adapterDariEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).toMatchObject({ mode: 'palsu' })
    expect(adapterDariEnv({ NODE_ENV: 'production' })).toEqual({
      mode: null,
      pesan: 'AI_ADAPTER belum diisi di env server: asli (situs live) atau palsu (pratinjau dan uji lokal).',
    })
    expect(adapterDariEnv({ AI_ADAPTER: 'claude' })).toEqual({ mode: null, pesan: 'AI_ADAPTER "claude" tidak dikenal. Isi asli atau palsu.' })
  })
})

describe('adapter Claude asli (fetch tiruan)', () => {
  it('POST /v1/messages dengan x-api-key, anthropic-version, dan content-type; keluaran JSON lewat output_config; tanpa temperature', async () => {
    const { adapter, dicatat } = asli(json(200, pesan('{"judulSeo":"Judul"}')))
    expect(await adapter.kirim(PERMINTAAN)).toEqual({ status: 'berhasil', json: { judulSeo: 'Judul' }, token: { masuk: 120, keluar: 80 }, idPermintaan: 'req_uji' })
    expect(dicatat).toEqual([
      {
        url: URL_MESSAGES,
        method: 'POST',
        headers: { 'x-api-key': KUNCI, 'anthropic-version': VERSI_API, 'content-type': 'application/json' },
        body: {
          model: 'claude-haiku-5-5',
          max_tokens: 4_000,
          system: 'Kamu editor point.',
          messages: [{ role: 'user', content: '<artikel>Isi.</artikel>' }],
          output_config: { effort: 'low', format: { type: 'json_schema', schema: PERMINTAAN.skema } },
        },
      },
    ])
    expect(URL_MESSAGES).toBe('https://api.anthropic.com/v1/messages')
    expect(VERSI_API).toBe('2026-10-21')
  })

  it('token masuk termasuk tulis dan baca cache; keluaran termasuk thinking', async () => {
    const { adapter } = asli(json(200, pesan('{}', 'end_turn', { input_tokens: 50, cache_creation_input_tokens: 20, cache_read_input_tokens: 10, output_tokens: 300 })))
    expect(await adapter.kirim(PERMINTAAN)).toMatchObject({ status: 'berhasil', token: { masuk: 80, keluar: 300 } })
  })

  it('529 dan 500 dicoba sekali lagi setelah 2 detik; 429 dengan retry-after menunggu sesuai header', async () => {
    const sibuk = asli(json(529, galatApi('overloaded_error', 'Overloaded')), json(200, pesan('{"judulSeo":"Lagi"}')))
    expect(await sibuk.adapter.kirim(PERMINTAAN)).toMatchObject({ status: 'berhasil', json: { judulSeo: 'Lagi' } })
    expect(sibuk.dicatat).toHaveLength(2)
    expect(sibuk.ditunggu).toEqual([2_000])

    const batas = asli(json(429, galatApi('rate_limit_error', 'Rate limited'), { 'retry-after': '3' }), json(200, pesan('{}')))
    expect(await batas.adapter.kirim(PERMINTAAN)).toMatchObject({ status: 'berhasil' })
    expect(batas.ditunggu).toEqual([3_000])

    const tetap = asli(json(500, galatApi('api_error', 'Internal')), json(500, galatApi('api_error', 'Internal')))
    expect(await tetap.adapter.kirim(PERMINTAAN)).toEqual({
      status: 'gagal',
      jenis: 'sibuk',
      pesan: 'Claude sedang sibuk atau bermasalah (500, api_error). Coba lagi beberapa menit lagi.',
      kodeHttp: 500,
      token: { masuk: 0, keluar: 0 },
      idPermintaan: 'req_uji',
    })
    expect(tetap.dicatat).toHaveLength(2)
  })

  it('429 tanpa retry-after (batas belanja) dan retry-after lebih dari 20 detik tidak diulang', async () => {
    const belanja = asli(json(429, galatApi('rate_limit_error', 'Spend cap')))
    expect(await belanja.adapter.kirim(PERMINTAAN)).toMatchObject({
      status: 'gagal',
      jenis: 'batas',
      pesan: 'Batas belanja akun Claude tercapai (429). Naikkan batasnya di Claude Console, atau tunggu bulan berikutnya.',
    })
    const lama = asli(json(429, galatApi('rate_limit_error', 'Rate limited'), { 'retry-after': '60' }))
    expect(await lama.adapter.kirim(PERMINTAAN)).toMatchObject({ jenis: 'batas', pesan: 'Batas permintaan API Claude tercapai (429). Coba lagi dalam 60 detik.' })
    expect(belanja.dicatat.length + lama.dicatat.length).toBe(2)
  })

  it('401, 402, 403, 404, dan 400 menjadi pesan yang menyebut langkah berikutnya, tanpa kunci API', async () => {
    const kasus: [number, string, string][] = [
      [401, 'kunci', 'Kunci API Claude ditolak (401). Periksa ANTHROPIC_API_KEY di env server.'],
      [402, 'tagihan', 'Tagihan akun Claude bermasalah (402). Periksa pembayaran di Claude Console.'],
      [403, 'izin', 'Kunci API tidak punya izin untuk permintaan ini (403). Periksa workspace kunci di Claude Console.'],
      [404, 'model', 'Model claude-haiku-5-5 tidak dikenal API Claude (404). Periksa AI_MODEL di env server.'],
      [400, 'permintaan', 'Permintaan ditolak API Claude (400, invalid_request_error): max_tokens terlalu besar.'],
    ]
    for (const [kode, jenis, teks] of kasus) {
      const { adapter, dicatat } = asli(json(kode, galatApi(kode === 400 ? 'invalid_request_error' : 'error', 'max_tokens terlalu besar')))
      const hasil = await adapter.kirim(PERMINTAAN)
      expect(hasil).toMatchObject({ status: 'gagal', jenis, pesan: teks, kodeHttp: kode })
      expect(JSON.stringify(hasil)).not.toContain(KUNCI)
      expect(dicatat).toHaveLength(1)
    }
  })

  it('refusal, max_tokens, dan teks bukan JSON menjadi galat yang tokennya tetap tercatat (sudah ditagih)', async () => {
    const usage = { input_tokens: 100, output_tokens: 40 }
    expect(await asli(json(200, pesan('', 'refusal', usage))).adapter.kirim(PERMINTAAN)).toMatchObject({
      status: 'gagal',
      jenis: 'ditolak',
      pesan: 'Claude menolak permintaan ini. Ubah masukannya lalu coba lagi.',
      token: { masuk: 100, keluar: 40 },
    })
    expect(await asli(json(200, pesan('{"judulSeo":"Jud', 'max_tokens', usage))).adapter.kirim(PERMINTAAN)).toMatchObject({
      jenis: 'terpotong',
      pesan: 'Jawaban Claude terpotong sebelum selesai. Coba lagi, atau persingkat masukannya.',
      token: { masuk: 100, keluar: 40 },
    })
    expect(await asli(json(200, pesan('Ini bukan JSON', 'end_turn', usage))).adapter.kirim(PERMINTAAN)).toMatchObject({
      jenis: 'format',
      pesan: 'Jawaban Claude tidak berbentuk JSON yang diminta. Coba lagi.',
    })
  })

  it('galat jaringan dicoba sekali lagi; batas waktu tidak diulang', async () => {
    const putus = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } })
    const ulang = asli(putus, json(200, pesan('{}')))
    expect(await ulang.adapter.kirim(PERMINTAAN)).toMatchObject({ status: 'berhasil' })
    expect(ulang.dicatat).toHaveLength(2)

    const habis = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
    const waktu = asli(habis)
    expect(await waktu.adapter.kirim(PERMINTAAN)).toEqual({
      status: 'gagal',
      jenis: 'jaringan',
      pesan: 'API Claude tidak menjawab dalam 120 detik. Coba lagi.',
      kodeHttp: null,
      token: { masuk: 0, keluar: 0 },
      idPermintaan: null,
    })
    expect(waktu.dicatat).toHaveLength(1)
  })
})

describe('adapter palsu', () => {
  it('menjawab contoh per tugas tanpa jaringan, mencatat permintaan, dan menghitung token kira-kira', async () => {
    const palsu = adapterPalsu()
    const hasil = await palsu.kirim(PERMINTAAN)
    expect(hasil).toMatchObject({ status: 'berhasil', json: CONTOH_PALSU.meta, idPermintaan: null })
    expect(hasil.token.masuk).toBeGreaterThan(0)
    expect(hasil.token.keluar).toBe(Math.ceil(JSON.stringify(CONTOH_PALSU.meta).length / 4))
    expect(palsu.permintaan).toEqual([PERMINTAAN])
  })

  it('jawaban antrean mendahului contoh; pemicu galat di masukan menjawab 529; reset mengosongkan semuanya', async () => {
    const palsu = adapterPalsu()
    palsu.jawab({ status: 'gagal', jenis: 'kunci', pesan: 'x', kodeHttp: 401, token: { masuk: 0, keluar: 0 }, idPermintaan: null })
    expect(await palsu.kirim(PERMINTAAN)).toMatchObject({ jenis: 'kunci' })
    expect(await palsu.kirim({ ...PERMINTAAN, pesan: `Keyword ${PEMICU_GALAT_PALSU}` })).toMatchObject({ status: 'gagal', jenis: 'sibuk', kodeHttp: 529 })
    palsu.contoh.meta = { judulSeo: 'Diganti tes' }
    expect(await palsu.kirim(PERMINTAAN)).toMatchObject({ json: { judulSeo: 'Diganti tes' } })
    palsu.reset()
    expect(palsu.permintaan).toEqual([])
    expect(await palsu.kirim(PERMINTAAN)).toMatchObject({ json: CONTOH_PALSU.meta })
  })
})
