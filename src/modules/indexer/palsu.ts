import type { AdapterIndexer, JenisIndexingApi, KirimanIndexNow } from './adapter'
import type { HasilIndeks, HasilPanggilan } from './tipe'

export type AksiPalsu = 'kirimSitemap' | 'periksaUrl' | 'kirimIndexNow' | 'kabariGoogle'

export type PanggilanPalsu =
  | { aksi: 'kirimSitemap'; properti: string; url: string }
  | { aksi: 'periksaUrl'; properti: string; url: string }
  | { aksi: 'kirimIndexNow'; kiriman: KirimanIndexNow }
  | { aksi: 'kabariGoogle'; url: string; jenis: JenisIndexingApi }

export type AdapterPalsu = AdapterIndexer & {
  /** Semua panggilan, berurutan. Tes memeriksa isi ini. */
  readonly panggilan: PanggilanPalsu[]
  /** Hasil inspeksi per URL. URL lain: belum dikenal Google. */
  readonly indeks: Map<string, HasilIndeks>
  /** Jawaban untuk panggilan berikutnya dari aksi itu, berurutan. Tanpa antrean jawaban: berhasil. */
  jawab(aksi: AksiPalsu, ...hasil: HasilPanggilan[]): void
  /** Mengosongkan panggilan, jawaban, dan hasil inspeksi. */
  reset(): void
}

const BELUM_DIKENAL: HasilIndeks = { verdict: 'NEUTRAL', coverageState: 'URL is unknown to Google', pageFetchState: null, lastCrawlTime: null, tautan: null }

/**
 * Adapter dalam memori untuk tes dan pengembangan (spesifikasi §5, adapter `palsu`). Tidak memanggil
 * jaringan; log mencatat adapter `palsu`, jadi kiriman palsu tidak tertukar dengan kiriman asli.
 */
export function adapterPalsu(): AdapterPalsu {
  const panggilan: PanggilanPalsu[] = []
  const indeks = new Map<string, HasilIndeks>()
  const antrean = new Map<AksiPalsu, HasilPanggilan[]>()

  const jawaban = (aksi: AksiPalsu, bawaan: HasilPanggilan): HasilPanggilan => antrean.get(aksi)?.shift() ?? bawaan

  return {
    panggilan,
    indeks,
    jawab(aksi, ...hasil) {
      antrean.set(aksi, [...(antrean.get(aksi) ?? []), ...hasil])
    },
    reset() {
      panggilan.length = 0
      indeks.clear()
      antrean.clear()
    },
    searchConsole: {
      nama: 'palsu',
      async kirimSitemap(properti, url) {
        panggilan.push({ aksi: 'kirimSitemap', properti, url })
        return jawaban('kirimSitemap', { status: 'berhasil', kodeHttp: 200, pesan: 'Sitemap index diterima (adapter palsu).' })
      },
      async periksaUrl(properti, url) {
        panggilan.push({ aksi: 'periksaUrl', properti, url })
        return jawaban('periksaUrl', {
          status: 'berhasil',
          kodeHttp: 200,
          pesan: 'Hasil inspeksi diterima (adapter palsu).',
          indeks: indeks.get(url) ?? BELUM_DIKENAL,
        })
      },
    },
    indexNow: {
      nama: 'palsu',
      async kirim(kiriman) {
        panggilan.push({ aksi: 'kirimIndexNow', kiriman })
        return jawaban('kirimIndexNow', { status: 'berhasil', kodeHttp: 200, pesan: 'Daftar URL diterima (adapter palsu).' })
      },
    },
    googleIndexing: {
      nama: 'palsu',
      async kabari(url, jenis) {
        panggilan.push({ aksi: 'kabariGoogle', url, jenis })
        return jawaban('kabariGoogle', { status: 'berhasil', kodeHttp: 200, pesan: `${jenis} diterima (adapter palsu).` })
      },
    },
  }
}
