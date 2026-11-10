import { urlAdmin } from '@/lib/admin'
import { teksBiaya } from '@/modules/ai/aturan'
import { Ikon } from '@/modules/redaksi/admin/IkonRedaksi'

import { LABEL_HARI, LABEL_JAM } from '../aturan'
import type { DataOtomasi } from '../data'

import { AksiOtomasi } from './AksiOtomasi'

import './otomasi.scss'

const WAKTU = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

/** Pesan galat terakhir ditampilkan sampai tiga hari. */
const UMUR_PESAN_MS = 3 * 86_400_000

/**
 * Kartu "Otomasi artikel" di beranda admin (spesifikasi §27, hanya admin): tiga kolom alur kerja, yaitu usulan
 * yang menunggu persetujuan, draf yang menunggu review, dan antrean terbit, dengan tombol aksinya. Pengaturan ada
 * di global Otomasi artikel.
 */
export function KartuOtomasi({ data, sisaAnggaran, mode, sekarang }: { data: DataOtomasi; sisaAnggaran: number; mode: string | null; sekarang: Date }) {
  const { pengaturan: p, menunggu, draf, antrean } = data
  const slot = p.slot.hari.length && p.slot.jam.length ? `${p.slot.hari.map((h) => LABEL_HARI[h]).join(', ')} pukul ${p.slot.jam.map((j) => LABEL_JAM[j]).join(', ')} WIB` : 'belum dipilih'
  const pesan = data.terakhir.pesan && data.terakhir.pesanPada && sekarang.getTime() - Date.parse(data.terakhir.pesanPada) < UMUR_PESAN_MS ? data.terakhir.pesan : null
  return (
    <section className="redaksi-kartu otomasi" aria-labelledby="otomasi-judul">
      <div className="otomasi__kepala">
        <span className="otomasi__ikon">
          <Ikon nama="bintang" ukuran={20} />
        </span>
        <div>
          <h2 id="otomasi-judul">Otomasi artikel</h2>
          <p className="redaksi-ket">
            AI mengusulkan dan menulis draf, kamu menyetujui dan mereview, lalu draf terbit sendiri di slot jadwal dan dikabarkan ke Google.
          </p>
        </div>
        <div className="otomasi__status">
          <a className={`redaksi-lencana redaksi-lencana--${p.aktif ? 'baik' : 'waspada'}`} href={urlAdmin.global('otomasi-artikel')}>
            <Ikon nama={p.aktif ? 'centangBulat' : 'segitiga'} />
            {p.aktif ? 'Nyala' : 'Mati'}
          </a>
          <span>
            Draf hari ini <strong>{data.drafHariIni}</strong>/{p.drafPerHari}
          </span>
          <span>
            Anggaran AI sisa <strong>{teksBiaya(sisaAnggaran)}</strong>
          </span>
        </div>
      </div>

      {(!p.aktif || mode !== 'asli' || pesan) && (
        <ul className="otomasi__catatan">
          {!p.aktif && (
            <li>
              Otomasi mati. Nyalakan dan pilih slot jadwal di <a href={urlAdmin.global('otomasi-artikel')}>Pengaturan, Otomasi artikel</a>. Tombol di bawah tetap bisa dipakai.
            </li>
          )}
          {mode !== 'asli' && <li>Claude belum tersambung (AI_ADAPTER bukan asli), jadi usulan dan draf berisi contoh adapter palsu.</li>}
          {pesan && <li className="otomasi__galat">Terakhir gagal: {pesan}</li>}
        </ul>
      )}

      <div className="otomasi__kolom">
        <section aria-labelledby="otomasi-usulan">
          <h3 id="otomasi-usulan">
            Usulan menunggu <span className="otomasi__jumlah">{menunggu.jumlah}</span>
          </h3>
          {menunggu.daftar.length === 0 ? (
            <p className="redaksi-kosong">Belum ada usulan. Minta usulan baru, atau tambah topikmu sendiri.</p>
          ) : (
            <ul className="otomasi__daftar">
              {menunggu.daftar.map((u) => (
                <li key={u.id}>
                  <a className="otomasi__judul" href={urlAdmin.dokumen('usulan-topik', u.id)}>
                    {u.judul}
                  </a>
                  <span className="otomasi__ket">
                    {u.pilar} · {u.kataKunci}
                  </span>
                  {u.alasan && <span className="otomasi__alasan">{u.alasan}</span>}
                  <span className="otomasi__baris-aksi">
                    <AksiOtomasi minta={{ id: u.id, status: 'disetujui' }} label="Setujui" utama labelAkses={`Setujui ${u.judul}`} />
                    <AksiOtomasi minta={{ id: u.id, status: 'ditolak' }} label="Tolak" labelAkses={`Tolak ${u.judul}`} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="otomasi__kaki">
            <AksiOtomasi minta={{ aksi: 'usulan' }} label="Minta usulan baru" />
            <a href={urlAdmin.buat('usulan-topik')}>Tambah topik sendiri</a>
            <a href={urlAdmin.daftar('usulan-topik')}>Semua usulan</a>
          </div>
        </section>

        <section aria-labelledby="otomasi-draf">
          <h3 id="otomasi-draf">
            Draf menunggu review <span className="otomasi__jumlah">{draf.length}</span>
          </h3>
          {draf.length === 0 ? (
            <p className="redaksi-kosong">Belum ada draf otomatis. {data.disetujui ? `${data.disetujui} topik disetujui menunggu ditulis.` : 'Setujui usulan dulu.'}</p>
          ) : (
            <ul className="otomasi__daftar">
              {draf.map((d) => (
                <li key={d.id}>
                  <a className="otomasi__judul" href={urlAdmin.dokumen('artikel', d.id)}>
                    {d.judul}
                  </a>
                  <span className="otomasi__ket">
                    {d.skorSeo ? `Panel SEO ${d.skorSeo}` : 'Panel SEO belum dihitung'}
                    {d.cekAngka ? ` · ${d.cekAngka} [cek angka]` : ''}
                  </span>
                  <span className={d.alasan.length ? 'otomasi__alasan' : 'otomasi__siap'}>
                    {d.alasan.length ? d.alasan.join(' ') : 'Siap masuk antrean terbit.'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="otomasi__petunjuk">Review: cocokkan angka dengan sumber, hapus setiap [cek angka], tambahkan pengalamanmu, centang tiga butir Review, lalu simpan.</p>
          <div className="otomasi__kaki">
            <AksiOtomasi minta={{ aksi: 'tulis' }} label="Tulis 1 draf sekarang" />
            {data.disetujui > 0 && <span className="otomasi__ket">{data.disetujui} topik antre ditulis</span>}
          </div>
        </section>

        <section aria-labelledby="otomasi-antrean">
          <h3 id="otomasi-antrean">
            Antrean terbit <span className="otomasi__jumlah">{antrean.length}</span>
          </h3>
          {antrean.length === 0 ? (
            <p className="redaksi-kosong">Belum ada draf terjadwal.</p>
          ) : (
            <ol className="otomasi__daftar">
              {antrean.map((a) => (
                <li key={a.id}>
                  <span className="otomasi__waktu">{WAKTU.format(new Date(a.waktu))} WIB</span>
                  <a className="otomasi__judul" href={urlAdmin.dokumen('artikel', a.id)}>
                    {a.judul}
                  </a>
                  <span className="otomasi__baris-aksi">
                    <AksiOtomasi minta={{ id: a.usulan, status: 'keluar' }} label="Keluarkan" labelAkses={`Keluarkan ${a.judul} dari antrean`} />
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="otomasi__petunjuk">Slot: {slot}. Terbit antara jam itu sampai 59 menit sesudahnya, lalu dikabarkan ke Google dan IndexNow.</p>
          <div className="otomasi__kaki">
            <AksiOtomasi minta={{ aksi: 'antre' }} label="Antre sekarang" />
          </div>
        </section>
      </div>
    </section>
  )
}
