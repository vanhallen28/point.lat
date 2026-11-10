import type { Payload } from 'payload'

import { adapterAi, type KeadaanAdapter } from './adapter'
import { cadangkanAnggaran, selesaikanAnggaran } from './anggaran'
import { BATAS_PER_MENIT, BATAS_TUGAS, biaya, bulanJakarta, bytePrompt, cadanganBiaya, hargaModel, modelTugas, teksBiaya } from './aturan'
import { lengkapiBrief } from './brief-data'
import type { DefinisiTugas } from './prompt/bantu'
import { definisiBrief } from './prompt/brief'
import { definisiDraf } from './prompt/draf'
import { definisiArtikel } from './prompt/artikel'
import { definisiMeta } from './prompt/meta'
import { definisiUsulan } from './prompt/usulan'
import { ambilPengaturanAi } from './status'
import type { ModeAi, Token, TugasAi } from './tipe'

/** Prompt, skema, dan pemeriksa setiap tugas (`prompt/*.ts`); brief ditambah data dari database. */
const DEFINISI: Record<TugasAi, DefinisiTugas<unknown, unknown>> = {
  brief: { ...definisiBrief, lengkapi: lengkapiBrief } as DefinisiTugas<unknown, unknown>,
  draf: definisiDraf as DefinisiTugas<unknown, unknown>,
  meta: definisiMeta as DefinisiTugas<unknown, unknown>,
  usulan: definisiUsulan as DefinisiTugas<unknown, unknown>,
  artikel: definisiArtikel as DefinisiTugas<unknown, unknown>,
}

export type PenggunaAi = { id: number | string; peran?: string | null }

/** Alasan permintaan tidak sampai ke Claude atau tidak berhasil, dengan status HTTP untuk endpoint. */
export type AlasanGagal = 'masukan' | 'mati' | 'belum-dipasang' | 'harga' | 'batas' | 'anggaran' | 'claude'

const KODE_HTTP: Record<AlasanGagal, number> = { masukan: 400, mati: 503, 'belum-dipasang': 503, harga: 503, batas: 429, anggaran: 402, claude: 502 }

export type HasilJalankan =
  | { status: 'berhasil'; tugas: TugasAi; hasil: unknown; model: string; mode: ModeAi; biaya: number; token: Token }
  | { status: 'gagal'; alasan: AlasanGagal; kodeHttp: number; pesan: string; /** Alasan pemeriksa bila jawaban tidak bisa dipakai. */ rinci?: string }

export type OpsiJalankan = {
  /** `null` untuk jalan sistem (Otomasi artikel lewat cron atau tombol admin), yang dijaga kunci sendiri, bukan batas per menit. */
  pengguna: PenggunaAi | null
  /** ID artikel yang sedang diedit (untuk log), `null` untuk artikel yang belum disimpan. */
  dokumen?: number | null
  /** Pengganti adapter dari env (tes). */
  adapter?: KeadaanAdapter
  env?: Record<string, string | undefined>
  sekarang?: Date
}

const gagal = (alasan: AlasanGagal, pesan: string): HasilJalankan => ({ status: 'gagal', alasan, kodeHttp: KODE_HTTP[alasan], pesan })

/**
 * Satu-satunya pintu ke Claude (spesifikasi §5 modul `ai`: `jalankan(tugas, dokumen) → saran`). Urutannya:
 * saklar global, adapter, masukan, batas per menit, harga model, cadangan anggaran (atomik), log
 * `berjalan`, panggilan, pemeriksaan jawaban, lalu biaya sebenarnya ke anggaran dan log. AI hanya
 * mengembalikan saran: tidak ada yang ditulis ke artikel di sini.
 */
export async function jalankan(payload: Payload, tugas: TugasAi, body: unknown, opsi: OpsiJalankan): Promise<HasilJalankan> {
  const sekarang = opsi.sekarang ?? new Date()
  const env = opsi.env ?? process.env
  const definisi = DEFINISI[tugas]

  const pengaturan = await ambilPengaturanAi(payload)
  if (!pengaturan.aktif) return gagal('mati', 'Asisten AI sedang dimatikan admin di Pengaturan, Asisten AI.')
  const keadaan = opsi.adapter ?? adapterAi()
  if (keadaan.mode === null) return gagal('belum-dipasang', `Asisten AI belum dipasang: ${keadaan.pesan}`)

  const dibaca = definisi.baca(body)
  if (typeof dibaca === 'string') return gagal('masukan', dibaca)
  const masukan = definisi.lengkapi ? await definisi.lengkapi(payload, dibaca) : dibaca

  if (opsi.pengguna) {
    const semenitLalu = new Date(sekarang.getTime() - 60_000).toISOString()
    const { totalDocs: baruSaja } = await payload.count({
      collection: 'log-ai',
      where: { and: [{ pengguna: { equals: opsi.pengguna.id } }, { waktu: { greater_than: semenitLalu } }] },
    })
    if (baruSaja >= BATAS_PER_MENIT) return gagal('batas', `Paling banyak ${BATAS_PER_MENIT} permintaan AI per menit. Tunggu sebentar lalu coba lagi.`)
  }

  const { model } = modelTugas(tugas, env)
  const harga = hargaModel(model, pengaturan.harga)
  if (!harga) return gagal('harga', `Harga model ${model} belum ada di Pengaturan, Asisten AI, jadi biayanya tidak bisa dihitung. Minta admin mengisinya.`)

  const { sistem, pesan, ringkasan } = definisi.prompt(masukan)
  const { maksToken, effort, batasMs, tanpaUlang } = BATAS_TUGAS[tugas]
  const cadangan = cadanganBiaya(bytePrompt(sistem, pesan, JSON.stringify(definisi.skema)), maksToken, harga)
  const bulan = bulanJakarta(sekarang)
  // Artikel yang sudah dihapus atau ID asal tidak dicatat (relasi log ke artikel harus menunjuk dokumen yang ada).
  const dokumen = opsi.dokumen && (await payload.count({ collection: 'artikel', where: { id: { equals: opsi.dokumen } } })).totalDocs ? opsi.dokumen : null
  const log = { waktu: sekarang.toISOString(), tugas, pengguna: opsi.pengguna ? Number(opsi.pengguna.id) : null, dokumen, ringkasan, model, mode: keadaan.mode }

  const cadang = await cadangkanAnggaran(payload, { bulan, cadangan, batas: pengaturan.anggaranBulanan })
  if (!cadang.berhasil) {
    const sisa = Math.max(0, pengaturan.anggaranBulanan - cadang.terpakai)
    const teks = `Anggaran AI bulan ini tidak cukup: sisa ${teksBiaya(sisa)}, sedangkan permintaan ini bisa memakai sampai ${teksBiaya(cadangan)}. Tombol AI aktif lagi awal bulan depan, atau setelah admin menaikkan anggaran.`
    await payload.create({ collection: 'log-ai', data: { ...log, status: 'anggaran-habis', pesan: teks } })
    return gagal('anggaran', teks)
  }

  const baris = await payload.create({ collection: 'log-ai', data: { ...log, status: 'berjalan' } })
  const mulai = Date.now()
  const jawaban = await keadaan.adapter.kirim({ tugas, model, sistem, pesan, skema: definisi.skema, maksToken, effort, batasMs, tanpaUlang })
  const durasiMs = Date.now() - mulai
  const ongkos = biaya(jawaban.token, harga)
  await selesaikanAnggaran(payload, { bulan, cadangan, biaya: ongkos })

  const hasil = jawaban.status === 'berhasil' ? definisi.periksa(jawaban.json, masukan) : null
  const pesanGagal =
    jawaban.status === 'gagal' ? jawaban.pesan : typeof hasil === 'string' ? 'Jawaban Claude tidak sesuai bentuk yang diminta. Coba lagi.' : null
  await payload.update({
    collection: 'log-ai',
    id: baris.id,
    data: {
      status: pesanGagal ? 'gagal' : 'berhasil',
      tokenMasuk: jawaban.token.masuk,
      tokenKeluar: jawaban.token.keluar,
      biaya: ongkos,
      durasiMs,
      pesan: pesanGagal ? `${pesanGagal}${typeof hasil === 'string' ? ` (${hasil})` : ''}` : null,
    },
  })
  if (pesanGagal) {
    const g = gagal('claude', pesanGagal) as Extract<HasilJalankan, { status: 'gagal' }>
    return typeof hasil === 'string' ? { ...g, rinci: hasil } : g
  }
  return { status: 'berhasil', tugas, hasil, model, mode: keadaan.mode, biaya: ongkos, token: jawaban.token }
}
