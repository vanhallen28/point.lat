import { Tautan } from '@/components/dasar/Tautan'
import { pathFor } from '@/lib/paths'
import { SLUG_KEBIJAKAN_PRIVASI } from '@/modules/iklan/aturan'
import { BATAS_PESAN, FRAGMEN, LABEL_TOPIK, TOPIK_PESAN } from '@/modules/pembaca/tipe'

import { FormPembaca } from './FormPembaca'
import { Jebakan } from './Jebakan'
import gaya from './Pembaca.module.css'

/**
 * Form kontak (blok `formKontak` di halaman statis, spesifikasi §23). Pesan disimpan di admin (Pesan masuk), tanpa
 * email. Batas isian di HTML sama dengan pemeriksaan server (`periksaKontak`), jadi browser sudah menolak isian yang
 * pasti ditolak. Pesan hasil untuk form tanpa JavaScript tampil lewat `:target` setelah endpoint mengalihkan kembali.
 */
export function FormKontak({ id, judul, pengantar, asal }: { id: string; judul: string; pengantar: string | null; asal: string }) {
  return (
    <section aria-labelledby={`${id}-judul`} className={gaya.kotak}>
      <h2 id={`${id}-judul`} className={gaya.judul}>
        {judul}
      </h2>
      {pengantar && <p className={gaya.pengantar}>{pengantar}</p>}
      <p id={FRAGMEN.pesanTerkirim} className={`${gaya.hasil} ${gaya.berhasil}`} tabIndex={-1}>
        Pesanmu sudah kami terima. Terima kasih.
      </p>
      <p id={FRAGMEN.pesanGagal} className={`${gaya.hasil} ${gaya.gagal}`} tabIndex={-1}>
        Pesan belum terkirim. Periksa lagi isianmu lalu kirim ulang. Bila masih gagal, coba lagi satu jam lagi.
      </p>
      <FormPembaca action="/api/pesan-masuk/kirim" label={judul} tombol="Kirim pesan">
        <input type="hidden" name="asal" value={asal} />
        <Jebakan />
        <div className={gaya.dua}>
          <p className={gaya.kolom}>
            <label htmlFor={`${id}-nama`}>Nama</label>
            <input id={`${id}-nama`} name="nama" type="text" required maxLength={BATAS_PESAN.nama} autoComplete="name" />
          </p>
          <p className={gaya.kolom}>
            <label htmlFor={`${id}-email`}>Email</label>
            <input id={`${id}-email`} name="email" type="email" required maxLength={BATAS_PESAN.email} autoComplete="email" inputMode="email" />
          </p>
        </div>
        <p className={gaya.kolom}>
          <label htmlFor={`${id}-topik`}>Topik</label>
          <select id={`${id}-topik`} name="topik" required defaultValue="">
            <option value="" disabled>
              Pilih topik
            </option>
            {TOPIK_PESAN.map((t) => (
              <option key={t} value={t}>
                {LABEL_TOPIK[t]}
              </option>
            ))}
          </select>
        </p>
        <p className={gaya.kolom}>
          <label htmlFor={`${id}-pesan`}>Pesan</label>
          <textarea
            id={`${id}-pesan`}
            name="pesan"
            required
            minLength={BATAS_PESAN.pesanMin}
            maxLength={BATAS_PESAN.pesanMaks}
            rows={6}
            aria-describedby={`${id}-pesan-bantuan`}
          />
          <span id={`${id}-pesan-bantuan`} className={gaya.bantuan}>
            Paling sedikit {BATAS_PESAN.pesanMin} karakter. Untuk koreksi, sebut judul tulisan dan bagian yang keliru.
          </span>
        </p>
        <p className={gaya.setuju}>
          <input id={`${id}-setuju`} name="setuju" type="checkbox" required />
          <label htmlFor={`${id}-setuju`}>
            Saya setuju nama, email, dan pesan ini disimpan point. untuk membalas pesan saya, sesuai{' '}
            <Tautan href={pathFor({ jenis: 'halaman', slug: SLUG_KEBIJAKAN_PRIVASI })}>Kebijakan Privasi</Tautan>.
          </label>
        </p>
      </FormPembaca>
    </section>
  )
}
