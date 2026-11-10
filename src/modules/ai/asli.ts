import type { Fetch } from '@/modules/indexer/google'

import type { AdapterAi, JawabanClaude, JenisGalatAi, PermintaanClaude } from './adapter'
import type { Token } from './tipe'

/**
 * Adapter Claude asli: satu `POST /v1/messages` lewat `fetch`, tanpa SDK. Bentuk permintaan dan jawaban
 * mengikuti dokumentasi Messages API (dibaca 5 November 2026): header `x-api-key`, `anthropic-version`,
 * dan `content-type`; keluaran JSON lewat `output_config.format` (structured outputs) dan tingkat usaha
 * lewat `output_config.effort`. `temperature` tidak dikirim (dihapus di versi 2026-10-21). Kunci API
 * hanya dibaca dari env server dan tidak pernah masuk log atau pesan galat.
 */

export const URL_MESSAGES = 'https://api.anthropic.com/v1/messages'
export const VERSI_API = '2026-10-21'
/** Batas tunggu satu permintaan. Draf satu bagian dengan Sonnet biasanya selesai jauh di bawah ini. */
export const BATAS_TUNGGU_MS = 120_000
/** Paling banyak dua kali kirim: sekali ulang untuk galat sementara (529, 500, 504, 429 dengan `retry-after`). */
const PERCOBAAN = 2
const JEDA_ULANG_MS = 2_000
/** `retry-after` lebih lama dari ini tidak ditunggu: editor diberi tahu untuk mencoba lagi nanti. */
const TUNGGU_MAKS_DETIK = 20

type OpsiAdapterAsli = { kunci: string; fetch?: Fetch; tunggu?: (ms: number) => Promise<void> }

type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }

type JawabanApi = {
  type?: string
  content?: { type?: string; text?: string }[]
  stop_reason?: string | null
  usage?: Usage
  error?: { type?: string; message?: string }
}

const jeda = (ms: number) => new Promise<void>((selesai) => setTimeout(selesai, ms))

/** Token dari `usage`: masukan termasuk tulis dan baca cache (dihitung dengan harga masukan, batas atas), keluaran termasuk thinking. */
export function tokenDari(usage: Usage | undefined): Token {
  const n = (v: number | null | undefined) => (typeof v === 'number' && v > 0 ? v : 0)
  return {
    masuk: n(usage?.input_tokens) + n(usage?.cache_creation_input_tokens) + n(usage?.cache_read_input_tokens),
    keluar: n(usage?.output_tokens),
  }
}

/** Badan `POST /v1/messages`. */
export function badanPermintaan(p: PermintaanClaude): Record<string, unknown> {
  return {
    model: p.model,
    max_tokens: p.maksToken,
    system: p.sistem,
    messages: [{ role: 'user', content: p.pesan }],
    output_config: { effort: p.effort, format: { type: 'json_schema', schema: p.skema } },
  }
}

function galat(jenis: JenisGalatAi, pesan: string, kodeHttp: number | null, token: Token, idPermintaan: string | null): JawabanClaude {
  return { status: 'gagal', jenis, pesan, kodeHttp, token, idPermintaan }
}

/** Arti jawaban galat HTTP dari API Claude, dengan langkah berikutnya untuk editor atau pemilik. */
export function galatHttp(kodeHttp: number, data: JawabanApi, model: string, retryAfter: number | null, idPermintaan: string | null): JawabanClaude {
  const token = tokenDari(data.usage)
  const tipe = data.error?.type ?? 'error'
  const pesanApi = (data.error?.message ?? '').replace(/\s+/g, ' ').slice(0, 200)
  if (kodeHttp === 401) return galat('kunci', 'Kunci API Claude ditolak (401). Periksa ANTHROPIC_API_KEY di env server.', kodeHttp, token, idPermintaan)
  if (kodeHttp === 402) return galat('tagihan', 'Tagihan akun Claude bermasalah (402). Periksa pembayaran di Claude Console.', kodeHttp, token, idPermintaan)
  if (kodeHttp === 403) return galat('izin', 'Kunci API tidak punya izin untuk permintaan ini (403). Periksa workspace kunci di Claude Console.', kodeHttp, token, idPermintaan)
  if (kodeHttp === 404) return galat('model', `Model ${model} tidak dikenal API Claude (404). Periksa AI_MODEL di env server.`, kodeHttp, token, idPermintaan)
  if (kodeHttp === 429) {
    return retryAfter === null
      ? galat('batas', 'Batas belanja akun Claude tercapai (429). Naikkan batasnya di Claude Console, atau tunggu bulan berikutnya.', kodeHttp, token, idPermintaan)
      : galat('batas', `Batas permintaan API Claude tercapai (429). Coba lagi dalam ${retryAfter} detik.`, kodeHttp, token, idPermintaan)
  }
  if (kodeHttp >= 500) return galat('sibuk', `Claude sedang sibuk atau bermasalah (${kodeHttp}, ${tipe}). Coba lagi beberapa menit lagi.`, kodeHttp, token, idPermintaan)
  return galat('permintaan', `Permintaan ditolak API Claude (${kodeHttp}, ${tipe})${pesanApi ? `: ${pesanApi}` : ''}.`, kodeHttp, token, idPermintaan)
}

/** Jawaban 200: teks JSON dari blok `text`; `refusal` dan `max_tokens` menjadi galat yang tetap ditagih. */
export function bacaJawaban(data: JawabanApi, idPermintaan: string | null): JawabanClaude {
  const token = tokenDari(data.usage)
  if (data.stop_reason === 'refusal') return galat('ditolak', 'Claude menolak permintaan ini. Ubah masukannya lalu coba lagi.', 200, token, idPermintaan)
  if (data.stop_reason === 'max_tokens' || data.stop_reason === 'model_context_window_exceeded') {
    return galat('terpotong', 'Jawaban Claude terpotong sebelum selesai. Coba lagi, atau persingkat masukannya.', 200, token, idPermintaan)
  }
  const teks = (data.content ?? []).find((b) => b.type === 'text')?.text
  try {
    if (typeof teks !== 'string') throw new Error('tanpa teks')
    return { status: 'berhasil', json: JSON.parse(teks), token, idPermintaan }
  } catch {
    return galat('format', 'Jawaban Claude tidak berbentuk JSON yang diminta. Coba lagi.', 200, token, idPermintaan)
  }
}

/** Detik `retry-after`, atau `null` bila tidak ada atau tidak berupa angka. */
function bacaRetryAfter(nilai: string | null): number | null {
  if (!nilai || !/^\d+$/.test(nilai.trim())) return null
  return Number(nilai.trim())
}

const bisaDiulang = (j: JawabanClaude, retryAfter: number | null) =>
  j.status === 'gagal' &&
  ((j.jenis === 'sibuk' && j.kodeHttp !== null) ||
    (j.jenis === 'batas' && retryAfter !== null && retryAfter <= TUNGGU_MAKS_DETIK) ||
    (j.jenis === 'jaringan' && !j.pesan.includes('tidak menjawab')))

export function adapterAsli(opsi: OpsiAdapterAsli): AdapterAi {
  const ambil = opsi.fetch ?? fetch
  const tunggu = opsi.tunggu ?? jeda

  async function kirimSekali(p: PermintaanClaude): Promise<{ jawaban: JawabanClaude; retryAfter: number | null }> {
    try {
      const res = await ambil(URL_MESSAGES, {
        method: 'POST',
        headers: { 'x-api-key': opsi.kunci, 'anthropic-version': VERSI_API, 'content-type': 'application/json' },
        body: JSON.stringify(badanPermintaan(p)),
        signal: AbortSignal.timeout(p.batasMs ?? BATAS_TUNGGU_MS),
      })
      const idPermintaan = res.headers.get('request-id')
      const retryAfter = bacaRetryAfter(res.headers.get('retry-after'))
      const data = (await res.json().catch(() => ({}))) as JawabanApi
      if (!res.ok) return { jawaban: galatHttp(res.status, data, p.model, retryAfter, idPermintaan), retryAfter }
      return { jawaban: bacaJawaban(data, idPermintaan), retryAfter: null }
    } catch (e) {
      const g = e as Error & { cause?: { code?: string } }
      const pesan =
        g.name === 'TimeoutError'
          ? `API Claude tidak menjawab dalam ${(p.batasMs ?? BATAS_TUNGGU_MS) / 1000} detik. Coba lagi.`
          : `API Claude tidak bisa dihubungi (${g.cause?.code ?? g.message}).`
      return { jawaban: galat('jaringan', pesan, null, { masuk: 0, keluar: 0 }, null), retryAfter: null }
    }
  }

  return {
    nama: 'asli',
    async kirim(p) {
      let hasil = await kirimSekali(p)
      for (let ke = 2; ke <= (p.tanpaUlang ? 1 : PERCOBAAN) && bisaDiulang(hasil.jawaban, hasil.retryAfter); ke++) {
        await tunggu(hasil.retryAfter !== null ? hasil.retryAfter * 1000 : JEDA_ULANG_MS)
        hasil = await kirimSekali(p)
      }
      return hasil.jawaban
    },
  }
}
