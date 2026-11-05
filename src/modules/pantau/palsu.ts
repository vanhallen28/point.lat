import type { AdapterPantau, HasilAnalitik } from './adapter'
import type { BarisAnalitik, JawabanTautan, PermintaanAnalitik } from './tipe'

export type AdapterPantauPalsu = AdapterPantau & {
  /** Semua permintaan Search Analytics, berurutan. */
  readonly permintaan: { properti: string; permintaan: PermintaanAnalitik }[]
  /** Semua URL yang dibuka pemeriksa tautan, berurutan. */
  readonly dibuka: string[]
  /**
   * Data Search Analytics: semua baris untuk satu permintaan (adapter memotongnya sesuai `startRow` dan
   * `rowLimit`). `null` (bawaan): permintaan dilewati, seperti situs tanpa akun layanan.
   */
  dataAnalitik: ((permintaan: PermintaanAnalitik) => BarisAnalitik[]) | null
  /** Jawaban pemeriksa tautan per URL. URL lain: 200. */
  readonly jawabanTautan: Map<string, JawabanTautan>
  /** Jawaban Search Analytics berikutnya, berurutan, mendahului `dataAnalitik` (untuk galat). */
  jawabAnalitik(...hasil: HasilAnalitik[]): void
  reset(): void
}

/**
 * Adapter dalam memori untuk tes dan pengembangan. Tidak memanggil jaringan. Tanpa `dataAnalitik`,
 * sinkron Search Analytics dilewati, jadi data yang sudah tersimpan (misalnya data contoh E2E) tidak
 * tertimpa data kosong.
 */
export function adapterPalsu(): AdapterPantauPalsu {
  const permintaan: AdapterPantauPalsu['permintaan'] = []
  const dibuka: string[] = []
  const jawabanTautan = new Map<string, JawabanTautan>()
  const antrean: HasilAnalitik[] = []

  const palsu: AdapterPantauPalsu = {
    permintaan,
    dibuka,
    jawabanTautan,
    dataAnalitik: null,
    jawabAnalitik(...hasil) {
      antrean.push(...hasil)
    },
    reset() {
      permintaan.length = 0
      dibuka.length = 0
      jawabanTautan.clear()
      antrean.length = 0
      palsu.dataAnalitik = null
    },
    async analitik(properti, p) {
      permintaan.push({ properti, permintaan: p })
      const berikut = antrean.shift()
      if (berikut) return berikut
      if (!palsu.dataAnalitik) return { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' }
      return { status: 'berhasil', baris: palsu.dataAnalitik(p).slice(p.startRow, p.startRow + p.rowLimit) }
    },
    async periksaTautan(url) {
      dibuka.push(url)
      return jawabanTautan.get(url) ?? { kodeHttp: 200, galat: null }
    },
  }
  return palsu
}
