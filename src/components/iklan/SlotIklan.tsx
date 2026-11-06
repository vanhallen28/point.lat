import type { SlotSiap } from '@/modules/iklan/tipe'

import gaya from './SlotIklan.module.css'

/**
 * Wadah satu unit iklan (spesifikasi §11), server component. Tinggi dan lebar dipesan dari ukuran tetap
 * slot, jadi iklan yang dimuat belakangan tidak menggeser isi (CLS 0). Tampil hanya bila pengunjung memilih
 * Izinkan semua (CSS dari atribut `<html data-persetujuan>`); selain itu tidak menempati ruang. Label
 * "Iklan" terbaca dan terlihat. Bila AdSense tidak mengisi unit, kotak tetap berukuran sama dengan latar
 * permukaan dan label "Iklan" (tidak diciutkan, supaya isi di bawahnya tidak bergeser).
 * `PemuatIklan` membaca data di kotak saat kotak hampir terlihat.
 */
export function SlotIklan({ slot, className }: { slot: SlotSiap | null; className?: string }) {
  if (!slot) return null
  return (
    <div className={className ? `${gaya.slot} ${className}` : gaya.slot} data-slot-iklan={slot.id} data-lebar={slot.lebar}>
      <p className={gaya.label}>Iklan</p>
      <div
        className={gaya.kotak}
        style={{ width: slot.lebar, height: slot.tinggi }}
        data-kotak-iklan=""
        data-klien={slot.klien}
        data-unit={slot.unit}
        data-lebar={slot.lebar}
        data-tinggi={slot.tinggi}
        data-uji={slot.uji ? 'on' : undefined}
      />
    </div>
  )
}
