import { describe, expect, it } from 'vitest'

import {
  awalBulanJakarta,
  bersihkanTanda,
  biaya,
  bulanJakarta,
  bulanSebelum,
  bytePrompt,
  cadanganBiaya,
  HARGA_BAWAAN,
  hargaModel,
  keadaanAnggaran,
  MODEL_BAWAAN,
  modelTugas,
  potongTeks,
  teksBiaya,
} from '@/modules/ai/aturan'

const SONNET = { model: 'claude-sonnet-5-5', masuk: 2, keluar: 10 }
const HAIKU = { model: 'claude-haiku-5-5', masuk: 0.1, keluar: 0.5 }

describe('bulan anggaran (waktu Jakarta)', () => {
  it('bulan berganti pukul 00.00 WIB, bukan tengah malam UTC', () => {
    expect(bulanJakarta(new Date('2026-10-31T16:59:59.000Z'))).toBe('2026-10')
    expect(bulanJakarta(new Date('2026-10-31T17:00:00.000Z'))).toBe('2026-11')
    expect(bulanJakarta(new Date('2026-12-31T17:00:00.000Z'))).toBe('2027-01')
    expect(awalBulanJakarta('2026-11').toISOString()).toBe('2026-10-31T17:00:00.000Z')
  })

  it('bulan sebelumnya melewati pergantian tahun (retensi log 13 bulan)', () => {
    expect(bulanSebelum('2026-11', 1)).toBe('2026-10')
    expect(bulanSebelum('2026-01', 13)).toBe('2024-12')
    expect(bulanSebelum('2026-12', 12)).toBe('2025-12')
  })
})

describe('model dan harga', () => {
  it('model per tugas: AI_MODEL_{TUGAS}, lalu AI_MODEL, lalu bawaan; isian kosong diabaikan', () => {
    expect(modelTugas('meta', {})).toEqual({ model: MODEL_BAWAAN.meta, sumber: 'bawaan' })
    expect(MODEL_BAWAAN).toEqual({ brief: 'claude-sonnet-5-5', draf: 'claude-sonnet-5-5', meta: 'claude-haiku-5-5' })
    expect(modelTugas('brief', { AI_MODEL: ' claude-opus-5-5 ' })).toEqual({ model: 'claude-opus-5-5', sumber: 'env' })
    expect(modelTugas('meta', { AI_MODEL: 'claude-opus-5-5', AI_MODEL_META: 'claude-sonnet-5-5' })).toEqual({ model: 'claude-sonnet-5-5', sumber: 'env-tugas' })
    expect(modelTugas('draf', { AI_MODEL_DRAF: '  ' })).toEqual({ model: 'claude-sonnet-5-5', sumber: 'bawaan' })
  })

  it('harga dicari tepat menurut ID model; tanpa harga yang valid asisten tidak memanggil Claude', () => {
    expect(hargaModel('claude-sonnet-5-5', HARGA_BAWAAN)).toEqual(SONNET)
    expect(hargaModel('claude-fable-5-1', HARGA_BAWAAN)).toBeNull()
    expect(hargaModel('claude-sonnet-5-5', [{ model: 'claude-sonnet-5-5', masuk: -1, keluar: 10 }])).toBeNull()
    expect(hargaModel('claude-sonnet-5-5', null)).toBeNull()
  })

  it('biaya dari usage: token masuk dan keluar dikali harga per juta token', () => {
    expect(biaya({ masuk: 1_000, keluar: 500 }, SONNET)).toBe(0.007)
    expect(biaya({ masuk: 30_000, keluar: 4_000 }, HAIKU)).toBe(0.005)
    expect(biaya({ masuk: 0, keluar: 0 }, SONNET)).toBe(0)
  })

  it('cadangan: byte prompt ditambah pembungkus sebagai batas atas token masuk, max_tokens sebagai batas atas keluaran', () => {
    expect(bytePrompt('abc', 'de')).toBe(5)
    expect(bytePrompt('é')).toBe(2)
    expect(cadanganBiaya(10_000, 8_000, SONNET)).toBe(0.1002)
    expect(cadanganBiaya(0, 4_000, HAIKU)).toBe(0.00201)
  })

  it('keadaan anggaran: cukup hanya bila terpakai ditambah cadangan tidak melewati batas', () => {
    expect(keadaanAnggaran(10, 2, 0.1)).toEqual({ batas: 10, terpakai: 2, sisa: 8, cukup: true })
    expect(keadaanAnggaran(10, 9.95, 0.1)).toEqual({ batas: 10, terpakai: 9.95, sisa: 0.05, cukup: false })
    expect(keadaanAnggaran(10, 12, 0.1)).toEqual({ batas: 10, terpakai: 12, sisa: 0, cukup: false })
    expect(keadaanAnggaran(0, 0, 0.1).cukup).toBe(false)
  })

  it('biaya untuk admin dalam US$: empat desimal di bawah satu sen', () => {
    expect(teksBiaya(10)).toBe('US$10,00')
    expect(teksBiaya(1.5)).toBe('US$1,50')
    expect(teksBiaya(0.0123)).toBe('US$0,01')
    expect(teksBiaya(0.0012)).toBe('US$0,0012')
    expect(teksBiaya(0.007)).toBe('US$0,007')
    expect(teksBiaya(0)).toBe('US$0,00')
  })
})

describe('teks keluaran dan masukan', () => {
  it('em dash dan en dash diganti: rentang angka menjadi tanda hubung, selain itu koma', () => {
    expect(bersihkanTanda('Gaji naik \u2014 tapi pajak juga naik.')).toEqual({ teks: 'Gaji naik, tapi pajak juga naik.', diganti: 1 })
    expect(bersihkanTanda('Tulis 150\u2013160 karakter.')).toEqual({ teks: 'Tulis 150-160 karakter.', diganti: 1 })
    expect(bersihkanTanda('THR\u2014tunjangan hari raya\u2014wajib dibayar.')).toEqual({ teks: 'THR, tunjangan hari raya, wajib dibayar.', diganti: 2 })
    expect(bersihkanTanda('\u2014 Mulai dari sini \u2014.')).toEqual({ teks: 'Mulai dari sini.', diganti: 2 })
    expect(bersihkanTanda('Tanpa tanda pisah.')).toEqual({ teks: 'Tanpa tanda pisah.', diganti: 0 })
  })

  it('masukan dirapikan lalu dipotong di batas kata', () => {
    expect(potongTeks('  satu   dua\n\n\n\ntiga  ', 100)).toEqual({ teks: 'satu dua\n\ntiga', dipotong: false })
    expect(potongTeks('kata '.repeat(30), 22)).toEqual({ teks: 'kata kata kata kata', dipotong: true })
  })
})
