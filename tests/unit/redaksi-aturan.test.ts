import { describe, expect, it } from 'vitest'

import { tautanBagikan } from '@/lib/bagikan'
import { FITUR_BAWAAN, newsletterFormAktif, susunFitur } from '@/modules/fitur'
import { geserTanggal, ringkasSebelumnya } from '@/modules/pantau/aturan'
import {
  awalPekanJakarta,
  bacaPeriode,
  bandingkan,
  chipIndeks,
  jumlahPeriode,
  klikPerPekan,
  MAKS_CHIP_SEL,
  rasio,
  sapaan,
  susunKalender,
  urutkanPerhatian,
  type ArtikelKalender,
} from '@/modules/redaksi/aturan'

const hari = (tanggal: string, klik: number, impresi = klik * 10) => ({ tanggal, klik, impresi, ctr: klik / impresi, posisi: 5 })

describe('beranda admin: waktu dan periode', () => {
  it('pekan dimulai Senin 00.00 WIB', () => {
    // Senin 9 Nov 2026 21.42 WIB.
    expect(awalPekanJakarta(new Date('2026-11-09T14:42:00Z')).toISOString()).toBe('2026-11-08T17:00:00.000Z')
    // Minggu 8 Nov 23.30 WIB masih pekan sebelumnya.
    expect(awalPekanJakarta(new Date('2026-11-08T16:30:00Z')).toISOString()).toBe('2026-11-01T17:00:00.000Z')
    // Senin 00.10 WIB (Minggu 17.10 UTC) sudah pekan baru.
    expect(awalPekanJakarta(new Date('2026-11-08T17:10:00Z')).toISOString()).toBe('2026-11-08T17:00:00.000Z')
  })

  it('sapaan menurut jam Jakarta', () => {
    expect(sapaan(new Date('2026-11-09T00:00:00Z'))).toBe('Selamat pagi')
    expect(sapaan(new Date('2026-11-09T05:00:00Z'))).toBe('Selamat siang')
    expect(sapaan(new Date('2026-11-09T09:00:00Z'))).toBe('Selamat sore')
    expect(sapaan(new Date('2026-11-09T14:42:00Z'))).toBe('Selamat malam')
    expect(sapaan(new Date('2026-11-09T19:00:00Z'))).toBe('Selamat malam')
  })

  it('periode dari URL hanya nilai yang dikenal', () => {
    expect(bacaPeriode('28', [7, 28] as const, 7)).toBe(28)
    expect(bacaPeriode(['90'], [7, 28, 90] as const, 28)).toBe(90)
    expect(bacaPeriode('5', [7, 28] as const, 7)).toBe(7)
    expect(bacaPeriode(undefined, [7, 28] as const, 7)).toBe(7)
  })

  it('perbandingan: persen dan arah; tanpa data sebelumnya belum cukup', () => {
    expect(bandingkan(118, 100)).toEqual({ sekarang: 118, sebelumnya: 100, persen: 0.18, arah: 'naik' })
    expect(bandingkan(96, 100)).toMatchObject({ persen: -0.04, arah: 'turun' })
    expect(bandingkan(5, 0)).toEqual({ sekarang: 5, sebelumnya: 0, persen: null, arah: 'naik' })
    expect(bandingkan(5, null)).toEqual({ sekarang: 5, sebelumnya: null, persen: null, arah: null })
  })

  it('jumlah periode dibanding periode sebelumnya, hanya bila data mencakup periode itu', () => {
    const data = Array.from({ length: 14 }, (_, i) => hari(geserTanggal('2026-10-20', i), i < 7 ? 10 : 20))
    const p = jumlahPeriode(data, '2026-11-02', 7)
    expect(p.klik).toEqual({ sekarang: 140, sebelumnya: 70, persen: 1, arah: 'naik' })
    expect(p.seriKlik).toEqual([20, 20, 20, 20, 20, 20, 20])
    expect(jumlahPeriode(data.slice(1), '2026-11-02', 7).klik.sebelumnya).toBeNull()
    expect(ringkasSebelumnya(data, '2026-11-02', 7)).toMatchObject({ klik: 70, impresi: 700 })
    expect(ringkasSebelumnya(data.slice(1), '2026-11-02', 7)).toBeNull()
  })

  it('klik per pekan: blok 7 hari berakhir di tanggal data terakhir, hari kosong 0', () => {
    expect(klikPerPekan([hari('2026-11-02', 5), hari('2026-10-27', 3), hari('2026-10-26', 2)], '2026-11-02', 2)).toEqual([
      { dari: '2026-10-20', sampai: '2026-10-26', klik: 2 },
      { dari: '2026-10-27', sampai: '2026-11-02', klik: 8 },
    ])
  })
})

describe('beranda admin: kalender, status, perhatian', () => {
  const sekarang = new Date('2026-11-09T14:42:00Z')
  const a = (id: number, pilar: number, keadaan: ArtikelKalender['keadaan'], waktu: string | null): ArtikelKalender => ({
    id,
    judul: `Artikel ${id}`,
    href: `/admin/collections/artikel/${id}`,
    pilar,
    keadaan,
    waktu,
  })

  it('kolom pekan lalu, ini, depan, dan Draf; di luar tiga pekan tidak tampil; paling banyak 3 chip per sel', () => {
    const { kolom, baris } = susunKalender(
      [
        a(1, 1, 'terbit', '2026-11-03T02:00:00Z'),
        a(2, 1, 'terbit', '2026-11-09T08:00:00Z'),
        a(3, 1, 'terjadwal', '2026-11-17T01:00:00Z'),
        a(4, 1, 'terbit', '2026-10-01T01:00:00Z'),
        a(5, 2, 'draf', '2026-11-08T01:00:00Z'),
        a(6, 2, 'draf', '2026-11-09T01:00:00Z'),
        ...[7, 8, 9, 10].map((id) => a(id, 2, 'terbit', `2026-11-1${id - 7}T01:00:00Z`)),
      ],
      [1, 2],
      sekarang,
    )
    expect(kolom.map((k) => [k.mulai, k.ini])).toEqual([
      ['2026-11-01T17:00:00.000Z', false],
      ['2026-11-08T17:00:00.000Z', true],
      ['2026-11-15T17:00:00.000Z', false],
    ])
    expect(baris[0].sel.map((s) => s.chip.map((c) => c.id))).toEqual([[1], [2], [3], []])
    expect(baris[1].sel[3].chip.map((c) => c.id)).toEqual([6, 5])
    expect(baris[1].sel[1].chip).toHaveLength(MAKS_CHIP_SEL)
    expect(baris[1].sel[1].sisa).toBe(1)
  })

  it('status indeks ringkas untuk chip', () => {
    expect(chipIndeks('terindeks')).toBe('baik')
    expect(chipIndeks('dikecualikan')).toBe('kritis')
    expect(chipIndeks('galat')).toBe('kritis')
    expect(chipIndeks('ditemukan')).toBe('waspada')
    expect(chipIndeks(null)).toBeNull()
  })

  it('perlu perhatian: mendesak dulu, lalu jumlah; yang nol menjadi aman di bawah', () => {
    const item = (kunci: string, jumlah: number, tingkat: 'segera' | 'pekan') => ({ kunci, label: kunci, keterangan: '', jumlah, tingkat, href: '/' })
    expect(urutkanPerhatian([item('a', 0, 'segera'), item('b', 3, 'pekan'), item('c', 1, 'segera'), item('d', 5, 'pekan')]).map((i) => [i.kunci, i.tingkat])).toEqual([
      ['c', 'segera'],
      ['d', 'pekan'],
      ['b', 'pekan'],
      ['a', 'aman'],
    ])
    expect(rasio(3, 4)).toBe(0.75)
    expect(rasio(1, 0)).toBeNull()
  })
})

describe('fitur dan tombol bagikan', () => {
  it('saklar fitur: kolom kosong memakai bawaan (daftar isi dan waktu baca nyala)', () => {
    expect(susunFitur(null)).toEqual(FITUR_BAWAAN)
    expect(susunFitur({ formKontak: true, daftarIsi: false })).toEqual({ ...FITUR_BAWAAN, formKontak: true, daftarIsi: false })
  })

  it('pendaftaran lewat form point. hanya bila saklar menyala dan cara form', () => {
    expect(newsletterFormAktif({ ...FITUR_BAWAAN, newsletter: true }, { cara: 'form' })).toBe(true)
    expect(newsletterFormAktif({ ...FITUR_BAWAAN, newsletter: true }, null)).toBe(true)
    expect(newsletterFormAktif({ ...FITUR_BAWAAN, newsletter: true }, { cara: 'penyedia' })).toBe(false)
    expect(newsletterFormAktif(FITUR_BAWAAN, { cara: 'form' })).toBe(false)
  })

  it('tautan bagikan ter-encode, tanpa skrip pihak ketiga', () => {
    const t = tautanBagikan('https://point.lat/dana-darurat', 'Dana darurat: berapa & di mana?')
    expect(t.map((x) => x.nama)).toEqual(['WhatsApp', 'Telegram', 'X', 'Facebook'])
    expect(t[0].href).toBe('https://wa.me/?text=Dana%20darurat%3A%20berapa%20%26%20di%20mana%3F%20https%3A%2F%2Fpoint.lat%2Fdana-darurat')
    expect(t[3].href).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fpoint.lat%2Fdana-darurat')
  })
})
