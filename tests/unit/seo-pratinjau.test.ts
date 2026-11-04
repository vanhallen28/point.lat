import { describe, expect, it } from 'vitest'

import { teksPratinjau, urlTampil } from '@/modules/seo/pratinjau'

const data = {
  judul: 'Cara hitung gaji bersih 2026: potongan PPh 21 TER, BPJS Kesehatan, dan BPJS Ketenagakerjaan',
  deskripsi:
    'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Pelajari rumus TER 2026, contoh hitungan, dan kalkulator gratis untuk karyawan tetap di sini.',
  url: 'https://point.lat/glosarium/ptkp',
}

describe('pratinjau hasil Google dan kartu sosial', () => {
  it('URL tampilan Google memakai remah path', () => {
    expect(urlTampil('https://point.lat/glosarium/ptkp')).toBe('point.lat › glosarium › ptkp')
    expect(urlTampil('https://point.lat/')).toBe('point.lat')
    expect(urlTampil('bukan url')).toBe('bukan url')
  })

  it('desktop memotong judul sekitar 60 karakter, HP sekitar 70', () => {
    const desktop = teksPratinjau(data, 'desktop')
    const hp = teksPratinjau(data, 'hp')
    expect(desktop.judul).toBe('Cara hitung gaji bersih 2026: potongan PPh 21 TER, BPJS...')
    expect(hp.judul).toBe('Cara hitung gaji bersih 2026: potongan PPh 21 TER, BPJS Kesehatan...')
    expect(desktop.deskripsi).toBe(data.deskripsi)
    expect(hp.deskripsi.length).toBeLessThanOrEqual(120)
    expect(desktop.url).toBe('point.lat › glosarium › ptkp')
  })

  it('kartu sosial menampilkan domain huruf besar seperti WhatsApp dan Facebook', () => {
    const sosial = teksPratinjau(data, 'sosial')
    expect(sosial.url).toBe('POINT.LAT')
    expect(sosial.domain).toBe('point.lat')
    expect(sosial.judul.length).toBeLessThanOrEqual(65)
  })
})
