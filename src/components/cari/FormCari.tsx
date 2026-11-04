import { PATH_INDEKS } from '@/lib/paths'

import gaya from './Cari.module.css'

/**
 * Form pencarian tanpa JavaScript: GET ke `/cari?q=`. Label selalu terlihat (spesifikasi §14) dan
 * membungkus input, jadi tidak butuh `id`. `besar` untuk hero beranda.
 */
export function FormCari({ nilai = '', placeholder = 'misal: cara hitung THR', besar = false }: { nilai?: string; placeholder?: string; besar?: boolean }) {
  return (
    <form role="search" action={PATH_INDEKS.cari} method="get" className={besar ? `${gaya.form} ${gaya.besar}` : gaya.form}>
      <label className={gaya.label}>
        Cari topik
        <input type="search" name="q" defaultValue={nilai} placeholder={placeholder} enterKeyHint="search" className={gaya.input} />
      </label>
      <button type="submit" className={gaya.tombol}>
        Cari
      </button>
    </form>
  )
}
