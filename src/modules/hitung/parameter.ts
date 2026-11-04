import { kunciTanggal, teksAngka, teksTanggal, tengahKalimat } from './format'
import type { BarisTabel, DefinisiParameter, KolomTabel, ParameterTampil, ParameterTersimpan } from './tipe'

/**
 * Pemilihan parameter sesuai tanggal berlaku (spesifikasi §5) dan "parameter terakhir yang valid"
 * bila tidak ada yang berlaku (spesifikasi §15). Dokumen yang bentuknya tidak cocok dengan definisinya
 * (misalnya baris tabel tanpa tarif) diabaikan, sama dengan validasi CMS.
 */

/** Parameter wajib yang sama sekali belum ada: kalkulator tidak bisa dipakai. */
export class ParameterKosong extends Error {
  constructor(readonly label: string) {
    super(`Parameter "${label}" belum ada.`)
  }
}

export type GalatParameter = Partial<Record<'kunci' | 'nilai' | 'tabel', string>>

const KOLOM = ['label', 'batas', 'nilai'] as const

/** Memeriksa satu dokumen parameter terhadap definisinya. Dipakai validasi field koleksi `parameter-tools`. */
export function periksaDokumen(
  definisi: DefinisiParameter | undefined,
  doc: Pick<ParameterTersimpan, 'kunci' | 'nilai' | 'tabel'>,
  kunciDikenal: string[],
): GalatParameter {
  if (!definisi) {
    return {
      kunci: kunciDikenal.length
        ? `Kunci "${doc.kunci}" tidak dipakai kalkulator ini. Pilih salah satu: ${kunciDikenal.join(', ')}.`
        : 'Kalkulator ini tidak memakai parameter tersimpan.',
    }
  }
  const baris = doc.tabel ?? []
  if (definisi.jenis === 'angka') {
    const galat: GalatParameter = {}
    if (typeof doc.nilai !== 'number' || !Number.isFinite(doc.nilai)) galat.nilai = `Isi nilai ${tengahKalimat(definisi.label)}.`
    if (baris.length > 0) galat.tabel = 'Parameter ini berupa satu angka. Kosongkan tabel dan isi Nilai.'
    return galat
  }
  if (baris.length === 0) return { tabel: `Isi baris tabel ${tengahKalimat(definisi.label)}.` }
  for (const [i, b] of baris.entries()) {
    for (const kolom of KOLOM) {
      const def = definisi.kolom[kolom]
      if (!def) continue
      const isi = b[kolom]
      const kosong = isi === null || isi === undefined || isi === ''
      if (kolom === 'batas' && kosong && i === baris.length - 1) continue
      if (kosong) return { tabel: `Baris ${i + 1}: isi kolom ${def.judul}.` }
    }
    const sebelumnya = baris[i - 1]?.batas
    if (definisi.kolom.batas && i > 0 && typeof b.batas === 'number' && typeof sebelumnya === 'number' && b.batas <= sebelumnya) {
      return { tabel: `Baris ${i + 1}: ${definisi.kolom.batas.judul} harus lebih besar dari baris sebelumnya.` }
    }
  }
  return {}
}

const sah = (definisi: DefinisiParameter, doc: ParameterTersimpan) => Object.keys(periksaDokumen(definisi, doc, [])).length === 0

function labelBerlaku(doc: ParameterTersimpan): string {
  const mulai = teksTanggal(kunciTanggal(doc.berlakuMulai))
  return doc.berlakuSampai ? `${mulai} sampai ${teksTanggal(kunciTanggal(doc.berlakuSampai))}` : `mulai ${mulai}`
}

export type Aturan = {
  angka(kunci: string): number
  tabel(kunci: string): BarisTabel[]
  /** Parameter yang tidak berlaku pada tanggal hitung, sebagai kalimat untuk pembaca. */
  readonly peringatan: string[]
  /** Semua parameter definisi yang berhasil dipilih, siap ditampilkan. */
  tampil(): ParameterTampil[]
}

/**
 * Akses parameter untuk satu tanggal. Untuk setiap kunci dipilih dokumen yang berlaku pada tanggal itu
 * (berlaku mulai terbaru bila tumpang tindih). Bila tidak ada, dipakai dokumen terakhir yang mulai
 * berlaku sebelum tanggal itu, atau yang paling awal bila semuanya baru berlaku nanti, dan satu
 * peringatan dicatat. Kunci tanpa dokumen sah melempar `ParameterKosong`.
 */
export function buatAturan(definisi: DefinisiParameter[], parameter: ParameterTersimpan[], tanggal: Date | string): Aturan {
  const hari = kunciTanggal(tanggal)
  const peringatan: string[] = []
  const terpilih = new Map<string, ParameterTersimpan>()

  function pilih(kunci: string): { def: DefinisiParameter; doc: ParameterTersimpan } {
    const def = definisi.find((d) => d.kunci === kunci)
    if (!def) throw new Error(`Kunci parameter tidak didefinisikan: ${kunci}`)
    const ada = terpilih.get(kunci)
    if (ada) return { def, doc: ada }
    const calon = parameter
      .filter((p) => p.kunci === kunci && sah(def, p))
      .sort((a, b) => kunciTanggal(b.berlakuMulai).localeCompare(kunciTanggal(a.berlakuMulai)))
    const berlaku = calon.find((p) => kunciTanggal(p.berlakuMulai) <= hari && (!p.berlakuSampai || kunciTanggal(p.berlakuSampai) >= hari))
    const doc = berlaku ?? calon.find((p) => kunciTanggal(p.berlakuMulai) <= hari) ?? calon.at(-1)
    if (!doc) throw new ParameterKosong(def.label)
    if (!berlaku) {
      peringatan.push(
        `Angka ${tengahKalimat(def.label)} untuk ${teksTanggal(hari)} belum diperbarui. Hitungan ini memakai angka yang berlaku ${labelBerlaku(doc)}.`,
      )
    }
    terpilih.set(kunci, doc)
    return { def, doc }
  }

  return {
    angka: (kunci) => pilih(kunci).doc.nilai as number,
    tabel: (kunci) => pilih(kunci).doc.tabel ?? [],
    peringatan,
    tampil() {
      const hasil: ParameterTampil[] = []
      for (const d of definisi) {
        let doc: ParameterTersimpan
        try {
          doc = pilih(d.kunci).doc
        } catch (galat) {
          if (galat instanceof ParameterKosong) continue
          throw galat
        }
        const sumber = doc.sumber?.judul && doc.sumber.url ? { judul: doc.sumber.judul, url: doc.sumber.url } : null
        const dasar = { kunci: d.kunci, label: d.label, berlaku: labelBerlaku(doc), sumber }
        if (d.jenis === 'angka') {
          hasil.push({ ...dasar, jenis: 'angka', teks: teksAngka(doc.nilai as number, d.satuan) })
          continue
        }
        const kolom = KOLOM.filter((k) => d.kolom[k]).map((k) => [k, d.kolom[k] as KolomTabel] as const)
        hasil.push({
          ...dasar,
          jenis: 'tabel',
          kolom: kolom.map(([, k]) => k.judul),
          baris: (doc.tabel ?? []).map((b) =>
            kolom.map(([nama, k]) => {
              const isi = b[nama]
              if (nama === 'label') return String(isi ?? '')
              if (typeof isi !== 'number') return 'tanpa batas'
              return k.satuan ? teksAngka(isi, k.satuan) : String(isi)
            }),
          ),
        })
      }
      return hasil
    },
  }
}
