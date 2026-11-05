'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useCallback, useEffect, useState } from 'react'

import { teksBiaya } from '../aturan'
import type { StatusAsisten } from '../status'
import type { TugasAi } from '../tipe'

import { BagianBrief } from './BagianBrief'
import { BagianKlaim } from './BagianKlaim'
import { BagianMeta } from './BagianMeta'
import { BagianPola } from './BagianPola'
import { mintaStatus, mintaTugas, type JawabanAsisten } from './minta'

import './asisten.scss'

/** Memanggil satu tugas AI untuk artikel ini. Dipakai bagian brief, draf, dan meta. */
export type Minta = (tugas: TugasAi, masukan: unknown) => Promise<JawabanAsisten>

/**
 * Sidebar Asisten AI di editor artikel (spesifikasi §10): tugas yang memanggil Claude lewat
 * `/api/artikel/asisten`, dan cek pola tulisan serta cek klaim yang berjalan di browser tanpa API. Saat
 * asisten tidak bisa dipakai (dimatikan, belum dipasang, anggaran habis), tombol AI nonaktif dengan
 * alasannya; cek pola dan cek klaim tetap bisa dipakai. AI hanya memberi saran: isian artikel berubah
 * hanya saat editor menekan tombol terapkan.
 */
export function AsistenAi() {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const url = formatAdminURL({ apiRoute: api, path: '/artikel/asisten', serverURL })
  const [status, setStatus] = useState<StatusAsisten | { pesan: string } | null>(null)
  // Dinaikkan setiap selesai memanggil AI, supaya anggaran yang tampil ikut diperbarui.
  const [versi, setVersi] = useState(0)

  useEffect(() => {
    let aktif = true
    void mintaStatus(url).then((s) => {
      if (aktif) setStatus(s)
    })
    return () => {
      aktif = false
    }
  }, [url, versi])

  const minta = useCallback<Minta>(
    async (tugas, masukan) => {
      const jawaban = await mintaTugas(url, tugas, masukan, id)
      setVersi((v) => v + 1)
      return jawaban
    },
    [url, id],
  )

  const siap = status !== null && 'anggaran' in status

  return (
    <section className="asisten" aria-labelledby="asisten-judul">
      <h3 id="asisten-judul">Asisten AI</h3>
      {siap ? (
        <p className="asisten__anggaran">
          Anggaran bulan ini: {teksBiaya(status.anggaran.terpakai)} dari {teksBiaya(status.anggaran.batas)} terpakai.
        </p>
      ) : null}
      {siap && status.mode === 'palsu' ? <p className="asisten__catatan">Mode palsu: hasil AI berupa contoh, bukan dari Claude.</p> : null}
      {status === null ? <p className="asisten__keterangan">Memuat status asisten...</p> : null}
      {status?.pesan ? <p className="asisten__pesan asisten__pesan--peringatan">{status.pesan}</p> : null}
      <BagianBrief minta={minta} nonaktif={!siap || Boolean(status.pesan)} />
      <BagianMeta minta={minta} nonaktif={!siap || Boolean(status.pesan)} />
      <BagianPola frasaTambahan={siap ? status.frasaKlise : []} />
      <BagianKlaim />
    </section>
  )
}
