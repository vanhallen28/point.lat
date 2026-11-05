import type { Payload, PayloadRequest } from 'payload'

import { urlAbsolut } from '@/modules/seo/dokumen'

import { ambilPengaturanIndexing, batalkanBaris, catatLog, catatStatus, hapusStatus, simpanBaris } from './antrean'
import { rencanaKabar } from './aturan'
import type { Kabar } from './tipe'

/**
 * Mesin Indexing (spesifikasi §5 dan §8). Antarmuka modul:
 *
 * - `kabari(payload, kabar, opsi)`: dipanggil hook koleksi saat URL publik terbit, berubah besar, pindah,
 *   atau dihapus. Mencatat langkah revalidasi (sudah dikerjakan hook `revalidasiPublik` saat simpan) dan
 *   memasukkan langkah berikutnya ke antrean: sitemap, IndexNow, Indexing API (bila aktif), cek status.
 *
 * - `jalankanIndexer(payload, opsi)`: mengirim antrean yang jatuh tempo (cron dan `after()`), lalu
 *   mencatat setiap langkah di log dan hasil cek status di `status-indeks`.
 *
 * Antrean disimpan di Postgres (`antrean.ts`) dan dikirim terpisah dari penyimpanan dokumen, jadi
 * publikasi tidak pernah menunggu atau gagal karena mesin pencari.
 */
export async function kabari(payload: Payload, daftar: Kabar[], opsi: { req?: PayloadRequest; sekarang?: Date } = {}): Promise<void> {
  const { req } = opsi
  if (!req) return catatKabar(payload, daftar, opsi)
  const hasil = (giliran.get(req) ?? Promise.resolve()).then(() => catatKabar(payload, daftar, opsi))
  giliran.set(req, hasil.catch(() => undefined))
  await hasil
}

/**
 * Kabar dengan `req` yang sama dicatat bergiliran. Payload menjalankan hook setiap dokumen dalam hapus
 * dan update massal secara paralel di satu transaksi, sehingga tanpa giliran kabar mereka saling menyalip
 * di antara mencari dan menulis baris yang sama (baris sitemap, status indeks). Dikunci objek `req`, bukan
 * `req.context`, karena operasi Payload bisa mengganti objek `context`.
 */
const giliran = new WeakMap<PayloadRequest, Promise<void>>()

async function catatKabar(payload: Payload, daftar: Kabar[], opsi: { req?: PayloadRequest; sekarang?: Date }): Promise<void> {
  if (!daftar.length) return
  const { req } = opsi
  const sekarang = opsi.sekarang ?? new Date()
  const pengaturan = await ambilPengaturanIndexing(payload, req)
  for (const kabar of daftar) {
    await catatLog(
      payload,
      {
        url: urlAbsolut(pengaturan, kabar.path),
        jenis: kabar.jenis,
        langkah: 'revalidasi',
        adapter: 'next',
        status: 'berhasil',
        pesan: 'Cache halaman dan sitemap sudah dibuang saat dokumen disimpan.',
        percobaan: 1,
        waktu: sekarang,
      },
      req,
    )
    const rencana = rencanaKabar(kabar, pengaturan, sekarang)
    for (const baris of rencana.simpan) await simpanBaris(payload, baris, req)
    for (const langkah of rencana.batal) await batalkanBaris(payload, langkah, kabar.path, req)
    const cek = rencana.simpan.find((b) => b.langkah === 'cek-status')
    if (cek) await catatStatus(payload, kabar.path, { cekBerikutnya: cek.jadwal.toISOString() }, req)
    else await hapusStatus(payload, kabar.path, req)
  }
}

export { jalankanIndexer, jalankanSetelahRespons, type RingkasanJalan } from './jalan'
export { bandingkanVersi } from './aturan'
export { adapterIndexer, pakaiAdapterIndexer, type AdapterIndexer } from './adapter'
export { adapterPalsu, type AdapterPalsu } from './palsu'
export type { JenisKabar, Kabar, StatusIndeks, VersiPublik } from './tipe'
