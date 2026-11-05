import type { AdapterAi, JawabanClaude, PermintaanClaude } from './adapter'
import { bytePrompt } from './aturan'
import type { TugasAi } from './tipe'

/** Teks di masukan editor yang membuat adapter palsu menjawab galat 529 (uji keadaan galat di E2E dan uji visual). */
export const PEMICU_GALAT_PALSU = '[uji galat]'

/**
 * Jawaban contoh per tugas, sesuai skema keluaran masing-masing. Teksnya sengaja menyebut "adapter palsu"
 * supaya tidak pernah tertukar dengan hasil Claude bila tidak sengaja diterapkan di pratinjau.
 */
export const CONTOH_PALSU: Record<TugasAi, unknown> = {
  meta: {
    judulSeo: 'Contoh judul SEO dari adapter palsu untuk uji asisten',
    metaDeskripsi:
      'Contoh meta description dari adapter palsu. Teks ini hanya untuk uji lokal dan pratinjau, jadi ganti dengan ringkasan artikelmu sendiri sebelum terbit.',
    slug: 'contoh-slug-adapter-palsu',
    altGambarUtama: 'Contoh teks alternatif gambar utama dari adapter palsu',
    intinya: ['Poin pertama contoh dari adapter palsu.', 'Poin kedua contoh dari adapter palsu.', 'Poin ketiga contoh dari adapter palsu.'],
    faq: [
      { pertanyaan: 'Apa ini contoh pertanyaan dari adapter palsu?', jawaban: 'Ya. Jawaban ini contoh dari adapter palsu, bukan dari Claude.' },
      { pertanyaan: 'Kapan jawaban asli muncul?', jawaban: 'Setelah pemilik memasang kunci API Claude dan mengisi AI_ADAPTER=asli.' },
    ],
  },
  brief: {
    judulKerja: 'Contoh judul kerja dari adapter palsu',
    intent: 'informasional',
    alasanIntent: 'Contoh alasan dari adapter palsu: pencari ingin memahami caranya.',
    format: 'panduan',
    alasanFormat: 'Contoh alasan dari adapter palsu: langkah berurutan paling mudah diikuti.',
    keyphraseSekunder: ['contoh keyword sekunder satu', 'contoh keyword sekunder dua'],
    outline: [
      { h2: 'Contoh bagian pertama dari adapter palsu', h3: ['Contoh subbagian'], catatan: 'Contoh catatan isi bagian pertama.' },
      { h2: 'Contoh bagian kedua dari adapter palsu', h3: [], catatan: 'Contoh catatan isi bagian kedua.' },
    ],
    pertanyaan: ['Contoh pertanyaan pembaca pertama?', 'Contoh pertanyaan pembaca kedua?'],
    sudutPembeda: 'Contoh sudut pembeda dari adapter palsu.',
    perluDicek: ['Contoh angka yang harus dicek ke sumber resmi.'],
  },
  draf: {
    blok: [
      { jenis: 'paragraf', teks: 'Paragraf contoh dari adapter palsu \u2014 bukan tulisan Claude.' },
      { jenis: 'h3', teks: 'Contoh subbagian dari adapter palsu' },
      { jenis: 'butir', teks: 'Butir contoh pertama.' },
      { jenis: 'butir', teks: 'Butir contoh kedua.' },
    ],
    perluDicek: ['Contoh klaim yang harus dicek ke sumbernya.'],
  },
}

export type AdapterAiPalsu = AdapterAi & {
  /** Semua permintaan, berurutan. */
  readonly permintaan: PermintaanClaude[]
  /** Jawaban per tugas; tes boleh menggantinya. */
  contoh: Record<TugasAi, unknown>
  /** Jawaban berikutnya, berurutan, mendahului contoh (untuk galat dan jawaban khusus). */
  jawab(...jawaban: JawabanClaude[]): void
  reset(): void
}

/**
 * Adapter dalam memori untuk tes, dev, dan pratinjau. Tidak memanggil jaringan. Token dihitung kira-kira
 * (empat byte per token) supaya anggaran dan log tetap terisi seperti pemakaian sungguhan.
 */
export function adapterPalsu(): AdapterAiPalsu {
  const permintaan: PermintaanClaude[] = []
  const antrean: JawabanClaude[] = []
  const palsu: AdapterAiPalsu = {
    nama: 'palsu',
    permintaan,
    contoh: structuredClone(CONTOH_PALSU),
    jawab(...jawaban) {
      antrean.push(...jawaban)
    },
    reset() {
      permintaan.length = 0
      antrean.length = 0
      palsu.contoh = structuredClone(CONTOH_PALSU)
    },
    async kirim(p) {
      permintaan.push(p)
      const berikut = antrean.shift()
      if (berikut) return berikut
      if (p.pesan.includes(PEMICU_GALAT_PALSU)) {
        return { status: 'gagal', jenis: 'sibuk', pesan: 'Claude sedang sibuk atau bermasalah (529, overloaded_error). Coba lagi beberapa menit lagi.', kodeHttp: 529, token: { masuk: 0, keluar: 0 }, idPermintaan: null }
      }
      const json = structuredClone(palsu.contoh[p.tugas])
      return {
        status: 'berhasil',
        json,
        token: { masuk: Math.ceil(bytePrompt(p.sistem, p.pesan) / 4), keluar: Math.ceil(JSON.stringify(json).length / 4) },
        idPermintaan: null,
      }
    },
  }
  return palsu
}
