import { normalisasi } from '@/modules/seo/teks'

import { kalimatBlok, type Blok, type IsianAsisten } from './teks'

/**
 * Cek klaim (spesifikasi §10 butir 5): menandai angka dan klaim yang belum terhubung ke sumber. Fungsi
 * murni tanpa API: model tidak bisa membuka sumber, jadi memeriksa kebenaran angka tetap tugas editor.
 * Yang diperiksa di sini adalah jejaknya: kalimat berangka (persen, rupiah, jumlah, tanggal) atau
 * berisi atribusi ("menurut", "penelitian") harus menautkan sumbernya di kalimat itu atau menyebut
 * penerbit dan judul yang ada di blok Sumber. Atribusi kabur ("para ahli", "penelitian menunjukkan")
 * ditandai tersendiri bila kalimatnya tidak bertaut dan tidak menyebut sumber.
 */

export type PemicuKlaim = 'persen' | 'rupiah' | 'jumlah' | 'tanggal' | 'atribusi'

export const LABEL_PEMICU: Record<PemicuKlaim, string> = {
  persen: 'persen',
  rupiah: 'rupiah',
  jumlah: 'jumlah',
  tanggal: 'tanggal',
  atribusi: 'atribusi',
}

/** `bertaut`: ada tautan di kalimat itu; `cocok-sumber`: menyebut sumber di blok Sumber; dua lainnya perlu dicek. */
export type StatusKlaim = 'bertaut' | 'cocok-sumber' | 'atribusi-kabur' | 'tanpa-sumber'

export type TemuanKlaim = { letak: string; kutipan: string; pemicu: PemicuKlaim[]; status: StatusKlaim; alasan: string }

export type HasilKlaim = { klaim: TemuanKlaim[]; perluDicek: number; jumlahSumber: number }

const BULAN = 'januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember'

const POLA: [PemicuKlaim, RegExp][] = [
  ['persen', /\d+(?:[.,]\d+)?\s?(?:%|persen(?![\p{L}]))/iu],
  ['rupiah', /(?<![\p{L}])Rp\s?\d|(?<![\p{L}])rupiah(?![\p{L}])/iu],
  [
    'jumlah',
    /\d+(?:[.,]\d+)?\s?(?:ribu|juta|miliar|triliun|kali lipat|jam|hari|minggu|kg|gram|mg|kkal|kalori|liter)(?![\p{L}])|(?<![\d.,])\d{1,3}(?:\.\d{3})+(?![\d])/iu,
  ],
  ['tanggal', new RegExp(`(?<![\\d])(?:19|20)\\d{2}(?![\\d])|\\d{1,2}\\s+(?:${BULAN})(?![\\p{L}])`, 'iu')],
  [
    'atribusi',
    /(?<![\p{L}])(?:menurut|berdasarkan data|data dari|riset|penelitian|studi|survei|laporan|para ahli|pakar|ilmuwan|terbukti|secara ilmiah)(?![\p{L}])/iu,
  ],
]

/** Atribusi yang tidak menyebut siapa: tetap ditandai walau artikel punya sumber. */
const POLA_KABUR =
  /(?<![\p{L}])(?:para ahli|banyak ahli|pakar mengatakan|penelitian menunjukkan|studi menunjukkan|riset menunjukkan|sebuah studi|sebuah penelitian|beberapa penelitian|beberapa studi|banyak penelitian|konon)(?![\p{L}])/iu

export type SumberArtikel = NonNullable<IsianAsisten['sumber']>[number]

/** Nama yang boleh disebut di kalimat untuk menunjuk sumber: penerbit dan judul (minimal tiga huruf). */
function namaSumber(sumber: SumberArtikel[]): { asli: string; rapi: string }[] {
  const nama = new Map<string, string>()
  for (const s of sumber) {
    for (const n of [s?.penerbit, s?.judul]) {
      const rapi = normalisasi(n ?? '')
      if (rapi.length >= 3 && !nama.has(rapi)) nama.set(rapi, (n ?? '').trim())
    }
  }
  return [...nama].map(([rapi, asli]) => ({ asli, rapi }))
}

const kutip = (teks: string) => (teks.length > 160 ? `${teks.slice(0, 157).trimEnd()}...` : teks)

/** Memeriksa setiap kalimat di deck, Intinya, isi, dan FAQ. Subjudul tidak diperiksa. */
export function periksaKlaim(blok: Blok[], sumber: SumberArtikel[] | null | undefined): HasilKlaim {
  const daftarSumber = (sumber ?? []).filter((s) => s?.url?.trim() || s?.judul?.trim())
  const nama = namaSumber(daftarSumber)
  const klaim: TemuanKlaim[] = []

  for (const b of blok) {
    if (b.jenis === 'subjudul') continue
    for (const kalimat of kalimatBlok(b)) {
      const pemicu = POLA.filter(([, pola]) => pola.test(kalimat)).map(([p]) => p)
      if (pemicu.length === 0) continue
      const dasar = { letak: b.label, kutipan: kutip(kalimat), pemicu }
      const tautan = b.tautan.find((t) => kalimat.includes(t))
      const kabur = POLA_KABUR.exec(kalimat)
      const disebut = nama.find((n) => ` ${normalisasi(kalimat)} `.includes(` ${n.rapi} `))
      if (tautan) {
        klaim.push({ ...dasar, status: 'bertaut', alasan: `Bertaut ke sumber lewat "${tautan}".` })
      } else if (disebut) {
        klaim.push({ ...dasar, status: 'cocok-sumber', alasan: `Menyebut sumber di blok Sumber (${disebut.asli}). Pastikan angkanya sama dengan sumbernya.` })
      } else if (kabur) {
        klaim.push({ ...dasar, status: 'atribusi-kabur', alasan: `"${kabur[0]}" tidak menyebut siapa. Tulis nama lembaga atau penelitinya, tahunnya, dan tautkan sumbernya.` })
      } else {
        klaim.push({
          ...dasar,
          status: 'tanpa-sumber',
          alasan:
            daftarSumber.length === 0
              ? 'Belum ada sumber. Isi blok Sumber dan tautkan sumbernya di kalimat ini.'
              : 'Belum terhubung ke sumber. Tautkan sumbernya di kalimat ini, atau sebut penerbitnya seperti di blok Sumber.',
        })
      }
    }
  }

  return {
    klaim,
    perluDicek: klaim.filter((k) => k.status === 'atribusi-kabur' || k.status === 'tanpa-sumber').length,
    jumlahSumber: daftarSumber.length,
  }
}
