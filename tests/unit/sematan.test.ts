// @ts-expect-error paket jsdom (dependensi Vitest) tanpa deklarasi tipe; hanya konstruktornya yang dipakai.
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { butuhPersetujuan, cocokKuki, layananPersetujuan, pecahKuki, serialisasiKode, skripSematan, susunKode, validasiKuki, type KodeTerpasang } from '@/modules/sematan'

const baris = (isi: Partial<NonNullable<Parameters<typeof susunKode>[0]>['kode'] extends (infer B)[] | null | undefined ? B : never>) => ({
  id: 'k1',
  nama: 'Google Analytics',
  aktif: true,
  posisi: 'head' as const,
  jenis: 'persetujuan' as const,
  kuki: '_ga, _ga_*',
  kode: '<script>1</script>',
  ...isi,
})

describe('kode sematan: aturan', () => {
  it('nama cookie dipisah koma atau spasi; validasi menolak nama yang tidak sah', () => {
    expect(pecahKuki(' _ga, _ga_*  _fbp,_ga ')).toEqual(['_ga', '_ga_*', '_fbp'])
    expect(pecahKuki(null)).toEqual([])
    expect(validasiKuki('_ga, _ga_*')).toBe(true)
    expect(validasiKuki('')).toBe(true)
    expect(validasiKuki('_ga; path=/')).toMatch(/^Nama cookie tidak sah: _ga;, path=\//)
  })

  it('pola cookie: nama persis atau awalan bila diakhiri *', () => {
    expect(cocokKuki('_ga', '_ga')).toBe(true)
    expect(cocokKuki('_ga_ABC', '_ga_*')).toBe(true)
    expect(cocokKuki('_gat', '_ga')).toBe(false)
  })

  it('hanya kode aktif dan berisi; kode Butuh persetujuan hanya bila Kebijakan Privasi terbit', () => {
    const doc = {
      kode: [
        baris({}),
        baris({ id: 'k2', nama: 'Mati', aktif: false }),
        baris({ id: 'k3', nama: 'Kosong', kode: '   ' }),
        baris({ id: 'k4', nama: 'Penanda', jenis: 'wajib', posisi: 'bodyAkhir', kuki: null }),
      ],
    }
    expect(susunKode(doc, true).map((k) => k.id)).toEqual(['k1', 'k4'])
    expect(susunKode(doc, false).map((k) => k.id)).toEqual(['k4'])
    expect(susunKode(doc, true)[0]).toEqual({ id: 'k1', nama: 'Google Analytics', posisi: 'head', jenis: 'persetujuan', kode: '<script>1</script>', kuki: ['_ga', '_ga_*'] })
    expect(susunKode(null, true)).toEqual([])
    expect(butuhPersetujuan(susunKode(doc, true))).toBe(true)
    expect(butuhPersetujuan(susunKode(doc, false))).toBe(false)
    expect(layananPersetujuan(susunKode(doc, true))).toEqual(['Google Analytics'])
  })

  it('data JSON tidak bisa menutup elemen <script>', () => {
    const kode: KodeTerpasang[] = [{ id: 'a', nama: 'x', posisi: 'head', jenis: 'wajib', kode: '</script><script>alert(1)</script>', kuki: [] }]
    expect(serialisasiKode(kode)).not.toContain('</script>')
    expect(JSON.parse(serialisasiKode(kode))).toEqual(kode)
  })
})

describe('kode sematan: pemuat di browser', () => {
  /** Halaman dengan data kode dan pemuat; `persetujuan` mengisi atribut `<html>` seperti skrip awal. */
  function halaman(kode: KodeTerpasang[], persetujuan?: string) {
    const dom = new JSDOM(
      `<!doctype html><html${persetujuan ? ` data-persetujuan="${persetujuan}"` : ''}><head></head><body><main id="isi"></main>` +
        `<script type="application/json" id="kode-sematan">${serialisasiKode(kode)}</script></body></html>`,
      { runScripts: 'dangerously' },
    )
    dom.window.eval(skripSematan())
    return dom.window as Window & typeof globalThis & { wajib?: number; analitik?: number }
  }
  const KODE: KodeTerpasang[] = [
    { id: 'w', nama: 'Penanda', posisi: 'bodyAwal', jenis: 'wajib', kode: '<div id="penanda"></div><script>window.wajib = (window.wajib || 0) + 1</script>', kuki: [] },
    { id: 'p', nama: 'Analitik', posisi: 'head', jenis: 'persetujuan', kode: '<script>window.analitik = 1</script><meta name="uji" content="1">', kuki: ['_ga'] },
  ]

  it('kode Wajib langsung dipasang di posisinya dan skripnya berjalan; kode Butuh persetujuan menunggu', () => {
    const w = halaman(KODE, 'belum')
    expect(w.wajib).toBe(1)
    expect(w.document.body.firstElementChild?.id).toBe('penanda')
    expect(w.analitik).toBeUndefined()
    expect(w.document.head.querySelector('meta[name="uji"]')).toBeNull()
  })

  it('setelah Izinkan semua (peristiwa persetujuan) kode menunggu dipasang di <head>, sekali saja', () => {
    const w = halaman(KODE, 'belum')
    w.document.documentElement.setAttribute('data-persetujuan', 'semua')
    w.dispatchEvent(new w.Event('persetujuan'))
    w.dispatchEvent(new w.Event('persetujuan'))
    expect(w.analitik).toBe(1)
    expect(w.wajib).toBe(1)
    expect(w.document.head.querySelectorAll('meta[name="uji"]')).toHaveLength(1)
  })

  it('pilihan tersimpan Izinkan semua: semua kode dipasang saat halaman dimuat; Hanya yang perlu: tidak', () => {
    expect(halaman(KODE, 'semua').analitik).toBe(1)
    expect(halaman(KODE, 'perlu').analitik).toBeUndefined()
  })
})
