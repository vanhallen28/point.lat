import { Logo } from '@/components/dasar/Logo'
import { Tautan } from '@/components/dasar/Tautan'
import { ATRIBUT_BUKA } from '@/modules/iklan/persetujuan'
import type { DataFooter, Tautan as DataTautan } from '@/modules/konten/tipe'

import gaya from './Footer.module.css'

function Kolom({ judul, tautan }: { judul: string; tautan: DataTautan[] }) {
  const id = `kaki-${judul.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`
  return (
    <nav aria-labelledby={id} className={gaya.kolom}>
      <p id={id} className={gaya.judulKolom}>
        {judul}
      </p>
      <ul className={gaya.daftar}>
        {tautan.map((t) => (
          <li key={t.href}>
            <Tautan href={t.href}>{t.label}</Tautan>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Footer bergaya media (spesifikasi §25): merek dan tagline, kolom Jelajahi (menu header yang tampil, ditambah Tools),
 * kolom Tentang (tautan footer dari CMS), dan kolom Ikuti (akun sosial dan Saluran WhatsApp). Kolom tanpa isi
 * tidak dirender. Judul kolom berupa paragraf (bukan heading) supaya kerangka heading halaman tetap milik isinya.
 *
 * `persetujuan`: banner persetujuan cookie aktif (iklan atau Kode sematan yang butuh persetujuan), jadi footer memuat tombol "Pengaturan
 * cookie" yang membukanya lagi. Tombol itu tampil hanya bila JavaScript berjalan (CSS dari atribut `<html>`).
 */
export function Footer({ data, rubrik = [], persetujuan = false }: { data: DataFooter; rubrik?: DataTautan[]; persetujuan?: boolean }) {
  const sosial = data.whatsapp ? [...data.sosial, { label: 'Saluran WhatsApp', href: data.whatsapp }] : data.sosial
  return (
    <footer className={gaya.footer}>
      <div className={`kontainer ${gaya.isi}`}>
        <div className={gaya.merek}>
          <Logo ukuran="kecil" />
          <p className={gaya.tagline}>Intinya dulu.</p>
          <p className={gaya.ringkas}>Uang, karier, teknologi, pendidikan, dan kesehatan, dijelaskan dari intinya lalu bisa langsung kamu hitung.</p>
        </div>
        {rubrik.length > 0 && <Kolom judul="Jelajahi" tautan={rubrik} />}
        {data.tautan.length > 0 && <Kolom judul="Tentang point." tautan={data.tautan} />}
        {sosial.length > 0 && <Kolom judul="Ikuti point." tautan={sosial} />}
        <div className={gaya.bawah}>
          <p className={gaya.hakCipta}>{data.hakCipta}</p>
          {persetujuan && (
            <button type="button" className={gaya.pengaturan} {...{ [ATRIBUT_BUKA]: '' }}>
              Pengaturan cookie
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
