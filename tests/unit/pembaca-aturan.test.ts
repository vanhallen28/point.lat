import { describe, expect, it } from 'vitest'

import {
  ambilIp,
  bacaIsian,
  isiCsv,
  kenaJebakan,
  lewatBatas,
  periksaBerhenti,
  periksaDaftar,
  periksaKontak,
  rapikanAsal,
  rapikanEmail,
  selCsv,
  sidikPengirim,
} from '@/modules/pembaca/aturan'
import { MAKS_KIRIMAN_PER_JAM } from '@/modules/pembaca/tipe'

const KONTAK = { nama: '  Budi   Santoso ', email: ' Budi@Contoh.COM ', topik: 'koreksi', pesan: 'Angka PTKP di paragraf kedua keliru.\r\n', setuju: 'on' }

describe('isian form pembaca', () => {
  it('membaca JSON (dengan JavaScript) dan form biasa; selain teks diabaikan, centang JSON menjadi teks', () => {
    expect(bacaIsian(JSON.stringify({ nama: 'A', setuju: true, angka: 3, daftar: ['x'] }), 'application/json')).toEqual({ nama: 'A', setuju: 'ya' })
    expect(bacaIsian('nama=Budi+S&email=b%40c.co&setuju=on', 'application/x-www-form-urlencoded')).toEqual({ nama: 'Budi S', email: 'b@c.co', setuju: 'on' })
    expect(bacaIsian('{rusak', 'application/json')).toEqual({})
    expect(bacaIsian('[1,2]', 'application/json')).toEqual({})
  })

  it('kolom jebakan terisi berarti bot', () => {
    expect(kenaJebakan({ situs_web: 'http://spam' })).toBe(true)
    expect(kenaJebakan({ situs_web: '  ' })).toBe(false)
    expect(kenaJebakan({})).toBe(false)
  })

  it('email dirapikan huruf kecil; bentuk tidak wajar ditolak', () => {
    expect(rapikanEmail(' Nama@Contoh.Co.ID ')).toBe('nama@contoh.co.id')
    for (const salah of ['', 'nama', 'nama@contoh', 'nama@contoh.c', 'a b@contoh.com', `${'a'.repeat(250)}@contoh.com`, 'a@b.com\u0007']) {
      expect(rapikanEmail(salah)).toBeNull()
    }
  })

  it('form kontak: data bersih (spasi nama dirapikan, baris baru Windows jadi \\n), atau pesan galat per kolom', () => {
    expect(periksaKontak(KONTAK)).toEqual({
      ok: true,
      data: { nama: 'Budi Santoso', email: 'budi@contoh.com', topik: 'koreksi', pesan: 'Angka PTKP di paragraf kedua keliru.' },
    })
    expect(periksaKontak({ nama: '', email: 'x', topik: 'lain', pesan: 'pendek' })).toEqual({
      ok: false,
      galat: {
        nama: 'Tulis nama kamu.',
        email: 'Tulis alamat email yang benar, misalnya nama@contoh.com.',
        topik: 'Pilih topik pesan.',
        pesan: 'Pesan paling sedikit 20 karakter.',
        setuju: 'Centang persetujuan dulu.',
      },
    })
    expect(periksaKontak({ ...KONTAK, pesan: 'x'.repeat(5001) })).toMatchObject({ ok: false, galat: { pesan: 'Pesan paling panjang 5.000 karakter.' } })
    expect(periksaKontak({ ...KONTAK, nama: 'n'.repeat(101) })).toMatchObject({ ok: false, galat: { nama: 'Nama paling panjang 100 karakter.' } })
    expect(periksaKontak({ ...KONTAK, setuju: 'false' })).toMatchObject({ ok: false, galat: { setuju: 'Centang persetujuan dulu.' } })
  })

  it('newsletter: email dan persetujuan; berhenti: email saja', () => {
    expect(periksaDaftar({ email: 'A@B.co', setuju: 'on' })).toEqual({ ok: true, data: { email: 'a@b.co' } })
    expect(periksaDaftar({ email: 'A@B.co' })).toEqual({ ok: false, galat: { setuju: 'Centang persetujuan dulu.' } })
    expect(periksaBerhenti({ email: 'A@B.co' })).toEqual({ ok: true, data: { email: 'a@b.co' } })
    expect(periksaBerhenti({ email: 'bukan' })).toMatchObject({ ok: false })
  })

  it('path asal hanya path situs sendiri, tanpa kueri dan fragmen; selain itu beranda', () => {
    expect(rapikanAsal('/kontak?x=1#a')).toBe('/kontak')
    for (const salah of [undefined, '', 'https://jahat.com', '//jahat.com', '/\\jahat.com', '/a b', 'kontak']) expect(rapikanAsal(salah)).toBe('/')
  })
})

describe('batas kiriman', () => {
  it('IP dari x-forwarded-for paling kiri, lalu x-real-ip', () => {
    expect(ambilIp(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1', 'x-real-ip': '10.0.0.2' }))).toBe('203.0.113.5')
    expect(ambilIp(new Headers({ 'x-real-ip': '10.0.0.2' }))).toBe('10.0.0.2')
    expect(ambilIp(new Headers())).toBeNull()
  })

  it('sidik HMAC tanpa IP mentah: tetap dalam sehari, berbeda antarhari dan antar-rahasia', () => {
    const pagi = new Date('2026-11-09T01:00:00Z')
    const sore = new Date('2026-11-09T20:00:00Z')
    const besok = new Date('2026-11-10T01:00:00Z')
    const a = sidikPengirim('203.0.113.5', 'rahasia', pagi)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toContain('203')
    expect(sidikPengirim('203.0.113.5', 'rahasia', sore)).toBe(a)
    expect(sidikPengirim('203.0.113.5', 'rahasia', besok)).not.toBe(a)
    expect(sidikPengirim('203.0.113.5', 'lain', pagi)).not.toBe(a)
    expect(sidikPengirim('203.0.113.6', 'rahasia', pagi)).not.toBe(a)
  })

  it(`ditolak mulai kiriman ke-${MAKS_KIRIMAN_PER_JAM + 1} dalam sejam`, () => {
    expect(lewatBatas(MAKS_KIRIMAN_PER_JAM - 1)).toBe(false)
    expect(lewatBatas(MAKS_KIRIMAN_PER_JAM)).toBe(true)
  })
})

describe('CSV pelanggan newsletter', () => {
  it('sel dikutip bila perlu dan rumus spreadsheet dinetralkan', () => {
    expect(selCsv('biasa')).toBe('biasa')
    expect(selCsv('a,b')).toBe('"a,b"')
    expect(selCsv('kata "kutip"')).toBe('"kata ""kutip"""')
    expect(selCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(selCsv('+62')).toBe("'+62")
    expect(selCsv('@a')).toBe("'@a")
  })

  it('kepala email, sumber, terdaftar; baris CRLF', () => {
    expect(isiCsv([{ email: 'a@b.co', sumber: '/', terdaftar: '2026-11-09T01:00:00.000Z' }, { email: 'c@d.co', sumber: null, terdaftar: '2026-11-09T02:00:00.000Z' }])).toBe(
      'email,sumber,terdaftar\r\na@b.co,/,2026-11-09T01:00:00.000Z\r\nc@d.co,,2026-11-09T02:00:00.000Z\r\n',
    )
  })
})
