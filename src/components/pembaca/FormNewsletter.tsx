import { Tautan } from '@/components/dasar/Tautan'
import { PATH_BERHENTI_NEWSLETTER } from '@/lib/paths'
import { BATAS_PESAN, FRAGMEN } from '@/modules/pembaca/tipe'

import { FormPembaca } from './FormPembaca'
import { Jebakan } from './Jebakan'
import gaya from './Pembaca.module.css'

/**
 * Form daftar newsletter yang menyimpan email di database point. (spesifikasi §23), dengan centang persetujuan.
 * Dipakai kotak newsletter beranda dan akhir artikel; `id` membedakan kolom bila ada dua form di satu halaman.
 */
export function FormNewsletter({ id, asal }: { id: string; asal: string }) {
  return (
    <div className={gaya.newsletter}>
      <p id={FRAGMEN.daftarBerhasil} className={`${gaya.hasil} ${gaya.berhasil}`} tabIndex={-1}>
        Kamu sudah terdaftar. Terima kasih.
      </p>
      <p id={FRAGMEN.daftarGagal} className={`${gaya.hasil} ${gaya.gagal}`} tabIndex={-1}>
        Pendaftaran belum berhasil. Periksa alamat email dan centang persetujuan, lalu coba lagi.
      </p>
      <FormPembaca action="/api/pelanggan-newsletter/daftar" label="Daftar newsletter" tombol="Langganan gratis">
        <input type="hidden" name="asal" value={asal} />
        <Jebakan />
        <p className={gaya.kolom}>
          <label htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} name="email" type="email" required maxLength={BATAS_PESAN.email} autoComplete="email" inputMode="email" placeholder="nama@contoh.com" />
        </p>
        <p className={gaya.setuju}>
          <input id={`${id}-setuju`} name="setuju" type="checkbox" required />
          <label htmlFor={`${id}-setuju`}>
            Saya setuju email ini disimpan point. untuk mengirim newsletter. Bisa{' '}
            <Tautan href={PATH_BERHENTI_NEWSLETTER}>berhenti kapan saja</Tautan>.
          </label>
        </p>
      </FormPembaca>
    </div>
  )
}
