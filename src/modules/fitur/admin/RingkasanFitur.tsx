import type { UIFieldServerProps } from 'payload'

import { urlAdmin } from '@/lib/admin'
import { adapterDariEnv } from '@/modules/ai/adapter'
import { ambilIklan } from '@/modules/iklan/data'
import { iklanSiap } from '@/modules/iklan/aturan'

import './fitur.scss'

type Ringkas = { nama: string; keterangan: string; status: 'nyala' | 'mati' | 'perlu'; label: string; href: string }

/** Mode Mesin Indexing tanpa melempar galat (env produksi tanpa nilai ditampilkan sebagai perlu diisi). */
function modeIndexer(): 'asli' | 'palsu' | null {
  const v = process.env.INDEXER_ADAPTER
  return v === 'asli' || v === 'palsu' ? v : process.env.NODE_ENV === 'production' ? null : 'palsu'
}

/**
 * Ringkasan di atas halaman Fitur (spesifikasi §23): fitur yang diatur di halaman lain, dengan status dan tautan,
 * supaya halaman ini terasa seperti daftar plugin WordPress. Hanya membaca; saklarnya ada di halaman masing-masing.
 */
export async function RingkasanFitur({ payload }: UIFieldServerProps) {
  const [iklan, asisten, sematan, otomasi] = await Promise.all([
    ambilIklan(payload),
    payload.findGlobal({ slug: 'asisten-ai', depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: 'kode-sematan', depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: 'otomasi-artikel', depth: 0, overrideAccess: true }),
  ])
  const ai = adapterDariEnv()
  const indexer = modeIndexer()
  const kodeAktif = (sematan.kode ?? []).filter((k) => k.aktif !== false).length
  const daftar: Ringkas[] = [
    {
      nama: 'Iklan',
      keterangan: 'Google AdSense dan banner persetujuan cookie',
      status: iklanSiap(iklan) ? 'nyala' : iklan.aktif ? 'perlu' : 'mati',
      label: iklanSiap(iklan) ? 'Tampil' : iklan.aktif ? 'Belum siap' : 'Mati',
      href: urlAdmin.global('iklan'),
    },
    {
      nama: 'Asisten AI',
      keterangan: 'Brief, draf, dan meta dengan Claude',
      status: asisten.aktif === false || ai.mode === 'palsu' ? 'mati' : ai.mode === null ? 'perlu' : 'nyala',
      label: asisten.aktif === false ? 'Mati' : ai.mode === null ? 'Kunci belum diisi' : ai.mode === 'asli' ? 'Nyala' : 'Mode uji',
      href: urlAdmin.global('asisten-ai'),
    },
    {
      nama: 'Otomasi artikel',
      keterangan: 'Usulan topik, draf otomatis, dan slot jadwal terbit',
      status: otomasi.aktif ? (asisten.aktif === false || ai.mode !== 'asli' ? 'perlu' : 'nyala') : 'mati',
      label: otomasi.aktif ? (asisten.aktif === false ? 'Asisten AI mati' : ai.mode === 'asli' ? 'Nyala' : 'Mode uji') : 'Mati',
      href: urlAdmin.global('otomasi-artikel'),
    },
    {
      nama: 'Mesin Indexing',
      keterangan: 'Kabar ke Google dan IndexNow setiap terbit',
      status: indexer === 'asli' ? 'nyala' : indexer === null ? 'perlu' : 'mati',
      label: indexer === 'asli' ? 'Nyala' : indexer === null ? 'Env belum diisi' : 'Mode uji',
      href: urlAdmin.global('pengaturan-seo'),
    },
    {
      nama: 'Kode sematan',
      keterangan: 'Analytics, Pixel, dan kode layanan lain',
      status: kodeAktif ? 'nyala' : 'mati',
      label: kodeAktif ? `${kodeAktif} kode aktif` : 'Tidak ada',
      href: urlAdmin.global('kode-sematan'),
    },
  ]
  return (
    <section className="fitur-ringkas" aria-labelledby="fitur-ringkas-judul">
      <h2 id="fitur-ringkas-judul">Diatur di halaman lain</h2>
      <ul>
        {daftar.map((d) => (
          <li key={d.nama}>
            <a href={d.href}>
              <span className="fitur-ringkas__nama">{d.nama}</span>
              <span className="fitur-ringkas__ket">{d.keterangan}</span>
              <span className={`fitur-ringkas__status fitur-ringkas__status--${d.status}`}>{d.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <h2 className="fitur-ringkas__judul-saklar">Fitur situs</h2>
    </section>
  )
}
