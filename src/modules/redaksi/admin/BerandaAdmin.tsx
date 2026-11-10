import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { PATH_ADMIN, urlAdmin } from '@/lib/admin'
import { bacaRentang, paramRentang } from '@/modules/kunjungan/aturan'
import { ambilKunjungan } from '@/modules/kunjungan/data'
import { StatistikKunjungan } from '@/modules/kunjungan/admin/StatistikKunjungan'
import { KartuPaket } from '@/modules/paket/admin/KartuPaket'
import { statusPaket } from '@/modules/paket/status'
import { teksTanggal } from '@/modules/pantau/format'

import { bacaPeriode, PERIODE_BERANDA, sapaan } from '../aturan'
import { ambilRuangRedaksi } from '../data'

import {
  BarisAngka,
  KalenderKonten,
  KesehatanSitus,
  KolomGoogle,
  PerluPerhatian,
  TabelTerbit,
} from './BagianRedaksi'
import { Ikon } from './IkonRedaksi'

import './redaksi.scss'

const TANGGAL_PANJANG = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

/**
 * Beranda admin (`admin.components.views.dashboard`, spesifikasi §23), menggantikan daftar koleksi bawaan Payload.
 * Tata letak mengikuti gambar referensi pemilik: kepala dengan pilihan periode dan lencana layanan, empat kartu
 * angka, statistik kunjungan (admin, §26), kalender konten dan kolom Google, lalu terbit terbaru, kesehatan situs,
 * dan perlu perhatian. Semua angka
 * dari database point.; editor melihat bagian konten saja. Payload membungkus view dashboard dengan templat bawaan
 * (menu dan kepala), jadi komponen ini hanya isinya.
 */
export async function BerandaAdmin({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const pengguna = req.user as
    ({ nama?: string | null; peran?: string | null } & NonNullable<typeof req.user>) | null
  if (!pengguna) redirect(`${PATH_ADMIN}/login`)
  const sekarang = new Date()
  const periode = bacaPeriode(searchParams?.periode, PERIODE_BERANDA, 7)
  const data = await ambilRuangRedaksi(req.payload, pengguna, { sekarang, periode })
  // Paket konten awal (spesifikasi §24): hanya admin, dan hanya sampai semua artikel paketnya terbit.
  const paket = data.admin ? await statusPaket(req.payload, sekarang) : null
  // Statistik kunjungan (spesifikasi §26): hanya admin. Rentang dari `?kunjungan=` atau `?dari=&sampai=`.
  const kunjungan = data.admin ? await ambilKunjungan(req.payload, (pertama) => bacaRentang(searchParams, sekarang, pertama), sekarang) : null
  const paramKunjungan = kunjungan ? paramRentang(kunjungan.rentang) : {}
  const paramPeriode: Record<string, string> = periode === 7 ? {} : { periode: String(periode) }
  const urlPeriode = (p: number) => {
    const kueri = new URLSearchParams({ ...(p === 7 ? {} : { periode: String(p) }), ...paramKunjungan }).toString()
    return kueri ? `${PATH_ADMIN}?${kueri}` : PATH_ADMIN
  }
  const namaDepan = data.nama.split(/\s+/)[0]

  return (
    <Gutter className="redaksi">
      <header className="redaksi-kepala">
        <div>
          <h1>
            {sapaan(sekarang)}, {namaDepan}
          </h1>
          <p className="redaksi-kepala__sub">
            Ringkasan redaksi point. · {TANGGAL_PANJANG.format(sekarang)}
            {data.dataSampai && ` · data Google sampai ${teksTanggal(data.dataSampai)}`}
          </p>
        </div>
        <div className="redaksi-kepala__alat">
          {data.admin && (
            <nav className="redaksi-periode" aria-label="Periode angka Google">
              <Ikon nama="kalender" />
              {PERIODE_BERANDA.map((p) => (
                <a
                  key={p}
                  href={urlPeriode(p)}
                  aria-current={p === periode ? 'true' : undefined}
                >
                  {p} hari
                </a>
              ))}
            </nav>
          )}
          {data.layanan && (
            <a
              className={`redaksi-lencana redaksi-lencana--${data.layanan.normal ? 'baik' : 'waspada'}`}
              href={`${PATH_ADMIN}/seo`}
            >
              <Ikon nama={data.layanan.normal ? 'centangBulat' : 'segitiga'} />
              {data.layanan.pesan}
            </a>
          )}
          <a className="redaksi-tombol" href={urlAdmin.buat('artikel')}>
            <Ikon nama="plus" />
            Tulis artikel
          </a>
        </div>
      </header>

      {paket && paket.terbit < paket.total && <KartuPaket status={paket} />}

      <BarisAngka data={data} />

      {kunjungan && <StatistikKunjungan data={kunjungan} lain={paramPeriode} />}

      <div className={`redaksi-baris-dua${data.admin ? '' : ' redaksi-baris-dua--penuh'}`}>
        <KalenderKonten kalender={data.kalender} />
        {data.admin && <KolomGoogle data={data} />}
      </div>

      <div className={`redaksi-baris-tiga${data.admin ? '' : ' redaksi-baris-tiga--editor'}`}>
        <TabelTerbit data={data} />
        {data.kesehatan && <KesehatanSitus kesehatan={data.kesehatan} />}
        <PerluPerhatian item={data.perhatian} />
      </div>

      <p className="redaksi-kaki-halaman">
        <span>point. · Ruang redaksi</span>
        <span>Diperbarui saat halaman dibuka</span>
      </p>
    </Gutter>
  )
}
