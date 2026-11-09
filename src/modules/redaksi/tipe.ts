/** Tipe data beranda admin (spesifikasi §23). */

/** Angka periode ini dibanding periode sebelumnya. `sebelumnya` `null`: belum cukup data. */
export type Bandingan = { sekarang: number; sebelumnya: number | null; persen: number | null; arah: 'naik' | 'turun' | 'tetap' | null }

/** Warna status (selalu bersama ikon dan label): baik, waspada, kritis. */
export type StatusChip = 'baik' | 'waspada' | 'kritis'

export type ChipKalender = {
  id: number | string
  judul: string
  href: string
  keadaan: 'terbit' | 'terjadwal' | 'draf'
  waktu: string | null
}

export type KolomKalender = { jenis: 'pekan'; mulai: string; akhir: string; ini: boolean }

export type PilarRingkas = { id: number | string; nama: string; warna: string | null }

export type PekanKlik = { dari: string; sampai: string; klik: number }

export type ItemPerhatian = {
  kunci: string
  label: string
  keterangan: string
  jumlah: number
  /** `segera` (merah), `pekan` (kuning), `aman` (hijau; jumlah 0). */
  tingkat: 'segera' | 'pekan' | 'aman'
  href: string
}

export type ItemKesehatan = { label: string; bagian: number; total: number; keterangan: string }

export type DataRuangRedaksi = {
  admin: boolean
  nama: string
  sekarang: string
  periode: number
  /** Data Search Console sampai tanggal ini (waktu Pasifik), `null` bila belum ada. Hanya admin. */
  dataSampai: string | null
  layanan: { normal: boolean; pesan: string } | null
  google: { klik: Bandingan; impresi: Bandingan; seriKlik: number[]; seriImpresi: number[] } | null
  artikel: { terbit: number; terbitPekanIni: number; draf: number; terjadwal: number }
  indeks: { terindeks: number; menunggu: number; bermasalah: number; total: number } | null
  kalender: {
    kolom: KolomKalender[]
    baris: { pilar: PilarRingkas; jumlahTerbit: number; sel: { chip: ChipKalender[]; sisa: number }[] }[]
  }
  klikPekan: PekanKlik[] | null
  terbitTerbaru: {
    id: number | string
    judul: string
    href: string
    terbitPada: string | null
    pilar: PilarRingkas | null
    klik7: number | null
    indeks: { status: StatusChip; label: string } | null
  }[]
  kesehatan: { item: ItemKesehatan[]; anggaranAi: { terpakai: number; batas: number } | null } | null
  perhatian: ItemPerhatian[]
}
