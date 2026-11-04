import { describe, expect, it } from 'vitest'

import { hitung, siapkanKalkulator } from '@/modules/hitung'
import { PARAMETER_AWAL } from '@/seed/parameter-tools'

import { berhasil, langkah, ringkasan, rp } from './hitung-bantu'

const HARI_INI = '2026-11-05'
const tanpaBpjs = { bpjsKesehatan: '', bpjsKetenagakerjaan: '' }
const thr = (masukan: Record<string, string>) => hitung('thr', masukan, HARI_INI, PARAMETER_AWAL)

describe('THR: besar menurut Permenaker 6/2016', () => {
  it('contoh indonesiabaik.id: masa kerja 3 tahun, upah Rp7.000.000, THR Rp7.000.000', () => {
    const h = berhasil(thr({ upah: '7.000.000', masaKerja: '36', status: 'TK/0', ...tanpaBpjs }))
    expect(h.utama).toMatchObject({ label: 'THR kamu', nilai: 7_000_000, keterangan: '1 bulan upah, karena masa kerjamu 12 bulan atau lebih.' })
  })

  it('contoh indonesiabaik.id: masa kerja 6 bulan, upah Rp5.000.000, THR 6/12 x upah = Rp2.500.000', () => {
    const h = berhasil(thr({ upah: '5.000.000', masaKerja: '6', status: 'TK/0', ...tanpaBpjs }))
    expect(h.utama.nilai).toBe(2_500_000)
    expect(h.utama.keterangan).toBe('6/12 dari upah sebulan, karena masa kerjamu 6 bulan.')
    expect(h.rincian[0].langkah.find((l) => l.label === 'THR')?.catatan).toBe(`6/12 x ${rp('Rp 5.000.000')}`)
  })

  it('masa kerja kurang dari 1 bulan belum berhak THR', () => {
    const h = berhasil(thr({ upah: '5.000.000', masaKerja: '0', status: 'TK/0' }))
    expect(h.utama).toMatchObject({ nilai: 0, keterangan: 'Masa kerja belum 1 bulan, jadi kamu belum berhak THR keagamaan.' })
    expect(h.ringkasan).toEqual([])
  })
})

describe('THR: PPh 21 di bulan THR', () => {
  it('contoh DJP (TK/0, gaji Rp6.500.000, THR Rp6.500.000): TER 1% di bulan biasa, 5% di bulan THR', () => {
    const h = berhasil(thr({ upah: '6.500.000', masaKerja: '12', status: 'TK/0', ...tanpaBpjs }))
    expect(langkah(h, 'PPh 21 bulan biasa')).toBe(rp('Rp 65.000'))
    expect(langkah(h, 'Bruto bulan THR')).toBe(rp('Rp 13.000.000'))
    expect(langkah(h, 'PPh 21 bulan THR')).toBe(rp('Rp 650.000'))
    expect(ringkasan(h, 'Tambahan PPh 21')).toBe(585_000)
    expect(ringkasan(h, 'Perkiraan THR yang kamu terima')).toBe(5_915_000)
  })

  it('contoh form dengan BPJS: premi kantor ikut bruto bulan biasa dan bulan THR', () => {
    const k = siapkanKalkulator('thr', PARAMETER_AWAL, HARI_INI)
    expect(k.tombol).toBe('Hitung THR')
    expect(k.contoh).toEqual({ upah: '6.500.000', masaKerja: '12', status: 'TK/0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' })
    const h = berhasil(hitung('thr', k.contoh, HARI_INI, PARAMETER_AWAL))
    // Bruto biasa 6.500.000 + JKK 15.600 + JKM 19.500 + BPJS Kesehatan 260.000 = 6.795.100 (TER A 1,25%).
    expect(langkah(h, 'Bruto bulan biasa')).toBe(rp('Rp 6.795.100'))
    expect(langkah(h, 'PPh 21 bulan biasa')).toBe(rp('Rp 84.938'))
    expect(langkah(h, 'PPh 21 bulan THR')).toBe(rp('Rp 664.755'))
    expect(ringkasan(h, 'Tambahan PPh 21')).toBe(579_817)
    expect(k.dasar.map((d) => d.kunci)).toContain('ter-a')
  })

  it('masa kerja wajib angka bulat', () => {
    expect(thr({ upah: '5.000.000', masaKerja: '6,5', status: 'TK/0' })).toEqual({
      ok: false,
      pesan: null,
      galat: { masaKerja: 'Tulis masa kerja sampai hari raya dengan angka bulat, misalnya 12.' },
    })
  })
})
