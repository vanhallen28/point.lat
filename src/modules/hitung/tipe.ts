import type { ToolId } from '@/lib/konstanta'

/**
 * Tipe modul hitung. Masukan berupa teks apa adanya dari form (pembaca bisa mengetik "Rp 8.000.000"
 * atau "65,5"); hasil sudah membawa teks tampilan berformat Indonesia supaya komponen tidak memformat
 * angka sendiri.
 */

/** Nilai form per kunci isian: teks, atau daftar teks untuk kolom isian baris (IPK). */
export type Masukan = Record<string, string | string[] | undefined>

/** Satu baris tabel parameter: tabel TER, lapisan Pasal 17, kategori IMT, faktor aktivitas, konversi nilai. */
export type BarisTabel = { label?: string | null; batas?: number | null; nilai?: number | null }

/** Dokumen koleksi `parameter-tools` dalam bentuk yang dibaca modul ini (hasil `find` Payload cocok langsung). */
export type ParameterTersimpan = {
  toolId: ToolId
  kunci: string
  nilai?: number | null
  tabel?: BarisTabel[] | null
  berlakuMulai: string
  berlakuSampai?: string | null
  sumber?: { judul?: string | null; url?: string | null } | null
}

export type Satuan = 'rupiah' | 'persen' | 'kali' | 'bulan' | 'tahun' | 'kg' | 'cm' | 'kkal' | 'imt' | 'ipk' | 'sks' | 'angka'

export type Opsi = { nilai: string; label: string }

type IsianDasar = {
  kunci: string
  label: string
  bantuan: string | null
  /** Isian tambahan yang disimpan di bagian "Atur rincian" supaya form utama tetap pendek. */
  lanjutan?: boolean
}

export type IsianAngka = IsianDasar & {
  jenis: 'angka'
  satuan: Satuan
  desimal: boolean
  wajib: boolean
  min: number
  maks: number
  /** Isi awal form. Kosong untuk isian opsional yang sebaiknya dibiarkan kosong. */
  contoh: string
  /** Contoh di pesan galat bila `contoh` kosong. */
  petunjuk?: string
}

export type IsianPilihan = IsianDasar & {
  jenis: 'pilihan'
  opsi: Opsi[]
  contoh: string
  /** `kisi`: nilai pendek (misalnya "TK/0") tampil sebagai kisi tombol; labelnya dibacakan pembaca layar. */
  tampilan?: 'kisi'
}

export type IsianCentang = IsianDasar & { jenis: 'centang'; contoh: boolean }

/** Daftar baris dengan dua kolom (SKS dan nilai huruf). Masukan setiap kolom berupa daftar teks. */
export type IsianBaris = IsianDasar & {
  jenis: 'baris'
  kolom: [IsianAngka, IsianPilihan]
  contoh: [string, string][]
  maks: number
  labelBaris: string
}

export type Isian = IsianAngka | IsianPilihan | IsianCentang | IsianBaris

/** Label dan bantuan isian dari CMS (field `bantuanInput` tools), menimpa teks bawaan per kunci isian. */
export type TeksIsian = Record<string, { label: string; bantuan: string | null }>

/** Angka hasil beserta teks tampilannya (misalnya "Rp 7.554.552", "1,5%", "22,0"). */
export type Angka = { label: string; nilai: number; satuan: Satuan; teks: string }

export type Langkah = { label: string; teks: string; catatan?: string }

export type BagianRincian = { judul: string; langkah: Langkah[] }

export type HasilBerhasil = {
  ok: true
  utama: Angka & { keterangan: string | null }
  ringkasan: Angka[]
  rincian: BagianRincian[]
  /** Batasan hitungan yang perlu dibaca bersama hasil (misalnya "bukan pengganti tenaga kesehatan"). */
  catatan: string | null
  /** Parameter yang tidak ada untuk tanggal hitung sehingga dipakai parameter terakhir yang valid (spesifikasi §15). */
  peringatan: string[]
}

/** `galat`: pesan per kunci isian (kolom baris memakai `kunci.indeks`). `pesan`: masalah di luar isian. */
export type HasilGagal = { ok: false; galat: Record<string, string>; pesan: string | null }

export type Hasil = HasilBerhasil | HasilGagal

export type KolomTabel = { judul: string; satuan?: Satuan }

/** Definisi parameter yang dibaca satu kalkulator. Dipakai validasi CMS, seed, dan tampilan "angka aturan". */
export type DefinisiParameter =
  | { kunci: string; label: string; jenis: 'angka'; satuan: Satuan }
  | {
      kunci: string
      label: string
      jenis: 'tabel'
      /** Kolom yang wajib diisi di setiap baris. Kolom `batas` boleh kosong di baris terakhir (tanpa batas). */
      kolom: { label?: KolomTabel; batas?: KolomTabel; nilai?: KolomTabel }
    }

/** Parameter yang berlaku pada tanggal hitung, siap ditampilkan di halaman tools. */
export type ParameterTampil = {
  kunci: string
  label: string
  berlaku: string
  sumber: { judul: string; url: string } | null
} & ({ jenis: 'angka'; teks: string } | { jenis: 'tabel'; kolom: string[]; baris: string[][] })

/** Semua yang dibutuhkan halaman sebelum pembaca mengisi apa pun. */
export type Kalkulator = {
  isian: Isian[]
  contoh: Masukan
  tombol: string
  /** Judul bagian isian tambahan, `null` bila semua isian tampil langsung. */
  lanjutan: string | null
  dasar: ParameterTampil[]
  peringatan: string[]
  /** Terisi bila parameter wajib belum ada sama sekali di CMS: kalkulator tidak bisa dipakai. */
  pesan: string | null
}
