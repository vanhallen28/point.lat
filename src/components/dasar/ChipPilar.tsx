import type { PilarRingkas } from '@/modules/konten/tipe'

import gaya from './ChipPilar.module.css'

/** Label pilar berlatar warna pilar. Warna selalu didampingi nama pilar (spesifikasi §4). */
export function ChipPilar({ pilar }: { pilar: Pick<PilarRingkas, 'nama' | 'warna'> }) {
  return (
    <span className={gaya.chip} data-warna={pilar.warna}>
      {pilar.nama}
    </span>
  )
}
