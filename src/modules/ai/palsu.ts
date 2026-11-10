import type { AdapterAi, JawabanClaude, PermintaanClaude } from './adapter'
import { bytePrompt } from './aturan'
import type { TugasAi } from './tipe'

/** Teks di masukan editor yang membuat adapter palsu menjawab galat 529 (uji keadaan galat di E2E dan uji visual). */
export const PEMICU_GALAT_PALSU = '[uji galat]'

/** Paragraf contoh sekitar 55 kata untuk draf artikel palsu (lolos batas panjang pemeriksa). */
const PARAGRAF_PALSU =
  'Paragraf ini contoh dari adapter palsu, bukan tulisan Claude. Isinya sengaja panjang supaya draf contoh lolos pemeriksa panjang artikel otomatis. Ganti seluruh teks ini dengan tulisan sungguhan sebelum terbit, atau pasang kunci API Claude supaya draf berikutnya ditulis model. Kalimat ini hanya pengisi untuk uji lokal dan pratinjau.'

const ISI_ARTIKEL_PALSU = [
  `Contoh keyphrase adapter palsu muncul di paragraf pertama ini. ${PARAGRAF_PALSU}`,
  '## Bagian pertama contoh',
  PARAGRAF_PALSU,
  PARAGRAF_PALSU,
  '- Butir contoh pertama.\n- Butir contoh kedua dengan [tautan contoh](/dana-darurat).',
  '## Bagian kedua contoh',
  PARAGRAF_PALSU,
  'Tabel: Contoh angka\n| Komponen | Nilai |\n|---|---|\n| Tarif contoh | 5% [cek angka] |\n| Batas contoh | Rp1.000.000 |',
  '[[tool:gaji-bersih]]',
  PARAGRAF_PALSU,
  '## Bagian ketiga contoh',
  PARAGRAF_PALSU,
  '> [!tips] Contoh catatan\n> Catatan contoh dari adapter palsu.',
  PARAGRAF_PALSU,
  '## Bagian keempat contoh',
  PARAGRAF_PALSU,
  PARAGRAF_PALSU,
  PARAGRAF_PALSU,
  '## Bagian kelima contoh',
  PARAGRAF_PALSU,
  PARAGRAF_PALSU,
].join('\n\n')

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
  usulan: {
    usulan: [
      {
        judul: 'Contoh usulan pertama dari adapter palsu',
        kataKunci: 'contoh usulan adapter palsu satu',
        pilar: 'uang-karier',
        subkategori: '',
        subkategoriBaru: { slug: 'contoh-palsu', nama: 'Contoh palsu', deskripsi: 'Subkategori contoh dari adapter palsu.' },
        tipe: 'panduan',
        alasan: 'Contoh alasan dari adapter palsu: topik ini hanya untuk uji lokal.',
        tools: ['gaji-bersih'],
      },
      {
        judul: 'Contoh usulan kedua dari adapter palsu',
        kataKunci: 'contoh topik palsu kedua',
        pilar: 'belajar',
        subkategori: '',
        subkategoriBaru: { slug: '', nama: '', deskripsi: '' },
        tipe: 'explainer',
        alasan: 'Contoh alasan kedua dari adapter palsu.',
        tools: [],
      },
    ],
  },
  artikel: {
    judul: 'Contoh artikel otomatis dari adapter palsu',
    slug: 'contoh-artikel-otomatis-adapter-palsu',
    deck: 'Deck contoh dari adapter palsu. Ganti sebelum terbit.',
    intinya: ['Poin pertama contoh dari adapter palsu.', 'Poin kedua contoh dari adapter palsu.', 'Poin ketiga contoh dari adapter palsu.'],
    isi: ISI_ARTIKEL_PALSU,
    faq: [
      { pertanyaan: 'Apa ini artikel dari Claude?', jawaban: 'Bukan. Ini contoh dari adapter palsu untuk uji lokal.' },
      { pertanyaan: 'Kapan draf asli dibuat?', jawaban: 'Setelah pemilik memasang kunci API Claude dan mengisi AI_ADAPTER=asli.' },
    ],
    sumber: [
      { judul: 'Contoh sumber resmi pertama', url: 'https://www.pajak.go.id/', penerbit: 'Contoh penerbit' },
      { judul: 'Contoh sumber resmi kedua', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: 'Contoh penerbit' },
    ],
    judulSeo: ['Contoh judul SEO artikel otomatis dari adapter palsu', 'Judul SEO pendek', 'Contoh judul SEO lain'],
    metaDeskripsi: [
      'Contoh meta description artikel otomatis dari adapter palsu. Teks ini hanya untuk uji lokal dan pratinjau, jadi ganti sebelum terbit ya.',
      'Meta pendek.',
      'Meta lain.',
    ],
    keyphraseSekunder: ['contoh frasa palsu'],
    kataSampul: 'Contoh palsu',
    altSampul: 'Kartu sampul contoh dari adapter palsu',
    tools: ['gaji-bersih'],
    perluDicek: ['Contoh angka yang harus dicek.'],
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
