import type { Metadata } from 'next'

import { FormPembaca } from '@/components/pembaca/FormPembaca'
import { Jebakan } from '@/components/pembaca/Jebakan'
import gayaHalaman from '@/components/halaman/Halaman.module.css'
import gaya from '@/components/pembaca/Pembaca.module.css'
import { PATH_BERHENTI_NEWSLETTER } from '@/lib/paths'
import { muatSitus } from '@/modules/konten'
import { BATAS_PESAN, FRAGMEN } from '@/modules/pembaca/tipe'
import { metadata, type MasukanSeo } from '@/modules/seo'

const JUDUL = 'Berhenti langganan newsletter'
const DESKRIPSI = 'Hapus emailmu dari daftar newsletter point.'

/** Halaman layanan, bukan konten: tidak diindeks (spesifikasi §23). */
const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL, path: PATH_BERHENTI_NEWSLETTER, deskripsi: DESKRIPSI, noindex: true }

export async function generateMetadata(): Promise<Metadata> {
  return metadata(masukan, await muatSitus())
}

/**
 * Berhenti langganan newsletter (spesifikasi §23): email dihapus dari koleksi `pelanggan-newsletter`. Jawabannya
 * sama apakah email itu terdaftar atau tidak, jadi halaman ini tidak bisa dipakai memeriksa siapa yang berlangganan.
 * Halaman statis; form bekerja tanpa JavaScript.
 */
export default function BerhentiNewsletter() {
  return (
    <article className={`kontainer ${gayaHalaman.halaman}`}>
      <section aria-labelledby="berhenti-judul" className={gaya.kotak}>
        <h1 id="berhenti-judul" className={gaya.judul}>
          {JUDUL}
        </h1>
        <p className={gaya.pengantar}>
          Tulis email yang kamu pakai saat mendaftar. Email itu kami hapus dari daftar newsletter point. dan tidak kami
          simpan lagi.
        </p>
        <p id={FRAGMEN.berhentiBerhasil} className={`${gaya.hasil} ${gaya.berhasil}`} tabIndex={-1}>
          Email itu sudah tidak ada di daftar newsletter.
        </p>
        <p id={FRAGMEN.berhentiGagal} className={`${gaya.hasil} ${gaya.gagal}`} tabIndex={-1}>
          Permintaan belum berhasil. Periksa alamat email, lalu coba lagi.
        </p>
        <FormPembaca action="/api/pelanggan-newsletter/berhenti" label={JUDUL} tombol="Hapus email saya">
          <input type="hidden" name="asal" value={PATH_BERHENTI_NEWSLETTER} />
          <Jebakan />
          <p className={gaya.kolom}>
            <label htmlFor="berhenti-email">Email</label>
            <input id="berhenti-email" name="email" type="email" required maxLength={BATAS_PESAN.email} autoComplete="email" inputMode="email" />
          </p>
        </FormPembaca>
      </section>
    </article>
  )
}
