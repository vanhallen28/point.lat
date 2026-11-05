import { teksAngka, tengahKalimat } from './format'
import type { Isian, IsianAngka, IsianPilihan, Masukan } from './tipe'

/**
 * Membaca teks form menjadi angka dengan pesan galat yang bisa langsung ditampilkan di bawah field
 * (spesifikasi §15: penyebab + cara memperbaiki). Pembaca boleh mengetik "Rp 8.000.000", "8000000",
 * "65,5", atau "7.5"; satuan di belakang angka ("kg", "%") diabaikan.
 */

export type NilaiMasukan = Record<string, number | string | boolean | null | number[] | string[]>

type Bacaan = { nilai: number | null; galat?: undefined } | { galat: string; nilai?: undefined }

function bacaAngka(teks: string | undefined, isian: IsianAngka, label = isian.label): Bacaan {
  const misal = isian.petunjuk ?? isian.contoh
  const bersih = (teks ?? '')
    .replace(/[\s\u00a0]/g, '')
    .replace(/^rp\.?/i, '')
    .replace(/(%|kg|cm|tahun|bulan|sks|kali)$/i, '')
  if (bersih === '') {
    return isian.wajib ? { galat: `${label} belum diisi. Tulis angkanya, misalnya ${misal}.` } : { nilai: null }
  }
  let angka: number
  if (isian.satuan === 'rupiah') {
    if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(bersih)) {
      return { galat: `Tulis ${tengahKalimat(label)} dengan angka saja, misalnya ${misal}.` }
    }
    angka = Math.round(Number(bersih.replace(/\./g, '').replace(',', '.')))
  } else if (isian.desimal) {
    if (!/^\d+([.,]\d+)?$/.test(bersih)) {
      return { galat: `Tulis ${tengahKalimat(label)} dengan angka, misalnya ${misal}. Pakai koma untuk desimal.` }
    }
    angka = Number(bersih.replace(',', '.'))
  } else {
    if (!/^\d+$/.test(bersih)) return { galat: `Tulis ${tengahKalimat(label)} dengan angka bulat, misalnya ${misal}.` }
    angka = Number(bersih)
  }
  if (angka < isian.min) return { galat: `${label} paling sedikit ${teksAngka(isian.min, isian.satuan)}.` }
  if (angka > isian.maks) return { galat: `${label} paling banyak ${teksAngka(isian.maks, isian.satuan)}.` }
  return { nilai: angka }
}

function bacaPilihan(teks: string | undefined, isian: IsianPilihan, label = isian.label): { nilai: string } | { galat: string } {
  return isian.opsi.some((o) => o.nilai === teks) ? { nilai: teks as string } : { galat: `Pilih ${tengahKalimat(label)} dari daftar.` }
}

const daftar = (nilai: string | string[] | undefined): string[] => (Array.isArray(nilai) ? nilai : nilai === undefined ? [] : [nilai])

/**
 * Semua isian sekaligus. `galat` berisi pesan per kunci isian, atau `kunci.indeks` untuk kolom isian
 * baris; baris yang kedua kolomnya kosong dilewati.
 */
export function bacaMasukan(isian: Isian[], masukan: Masukan): { nilai: NilaiMasukan; galat: Record<string, string> } {
  const nilai: NilaiMasukan = {}
  const galat: Record<string, string> = {}
  for (const i of isian) {
    const teks = masukan[i.kunci]
    switch (i.jenis) {
      case 'angka': {
        const hasil = bacaAngka(typeof teks === 'string' ? teks : undefined, i)
        if (hasil.galat) galat[i.kunci] = hasil.galat
        else nilai[i.kunci] = hasil.nilai ?? null
        break
      }
      case 'pilihan': {
        const hasil = bacaPilihan(typeof teks === 'string' ? teks : undefined, i)
        if ('galat' in hasil) galat[i.kunci] = hasil.galat
        else nilai[i.kunci] = hasil.nilai
        break
      }
      case 'centang':
        nilai[i.kunci] = teks === 'ya'
        break
      case 'baris': {
        const [kolomAngka, kolomPilihan] = i.kolom
        const kiri = daftar(masukan[kolomAngka.kunci])
        const kanan = daftar(masukan[kolomPilihan.kunci])
        const angka: number[] = []
        const pilihan: string[] = []
        for (let b = 0; b < Math.min(Math.max(kiri.length, kanan.length), i.maks); b++) {
          if (!kiri[b]?.trim() && !kanan[b]) continue
          const nomor = `${i.labelBaris.toLowerCase()} ${b + 1}`
          const a = bacaAngka(kiri[b], { ...kolomAngka, wajib: true }, `${kolomAngka.label} ${nomor}`)
          const p = bacaPilihan(kanan[b], kolomPilihan, `${kolomPilihan.label.toLowerCase()} ${nomor}`)
          if (a.galat) galat[`${kolomAngka.kunci}.${b}`] = a.galat
          if ('galat' in p) galat[`${kolomPilihan.kunci}.${b}`] = p.galat
          if (!a.galat && !('galat' in p)) {
            angka.push(a.nilai as number)
            pilihan.push(p.nilai)
          }
        }
        if (angka.length === 0 && !Object.keys(galat).some((k) => k.startsWith(`${kolomAngka.kunci}.`) || k.startsWith(`${kolomPilihan.kunci}.`))) {
          galat[`${kolomAngka.kunci}.0`] = `Isi minimal satu ${i.labelBaris.toLowerCase()}: ${kolomAngka.label} dan ${kolomPilihan.label.toLowerCase()}.`
        }
        nilai[kolomAngka.kunci] = angka
        nilai[kolomPilihan.kunci] = pilihan
        break
      }
    }
  }
  return { nilai, galat }
}

/** Isi form awal dari contoh setiap isian. Dipakai halaman (hasil contoh tanpa JavaScript) dan seed. */
export function contohMasukan(isian: Isian[]): Masukan {
  const masukan: Masukan = {}
  for (const i of isian) {
    if (i.jenis === 'centang') masukan[i.kunci] = i.contoh ? 'ya' : ''
    else if (i.jenis === 'baris') {
      masukan[i.kolom[0].kunci] = i.contoh.map((b) => b[0])
      masukan[i.kolom[1].kunci] = i.contoh.map((b) => b[1])
    } else masukan[i.kunci] = i.contoh
  }
  return masukan
}
