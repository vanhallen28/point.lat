import { Tautan } from '@/components/dasar/Tautan'
import { JudulBersama } from '@/components/motion/JudulBersama'
import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
import type { KartuArtikel as DataKartu } from '@/modules/konten/tipe'

import gaya from './KartuArtikel.module.css'

/**
 * Kartu artikel berlatar warna pilar (Arah 3 "Kartu Intinya"): label pilar, judul, dan poin Intinya
 * pertama. Seluruh kartu satu tautan; judulnya heading supaya daftar kartu bisa dinavigasi.
 */
export function KartuArtikel({ kartu, tingkat = 'h3' }: { kartu: DataKartu; tingkat?: 'h2' | 'h3' }) {
  const Judul = tingkat
  return (
    <Tautan href={kartu.href} className={gaya.kartu} data-warna={kartu.pilar?.warna}>
      {kartu.pilar && <span className={gaya.label}>{kartu.pilar.nama}</span>}
      <JudulBersama id={kartu.id}>
        <Judul className={gaya.judul}>{kartu.judul}</Judul>
      </JudulBersama>
      {kartu.intinya && (
        <p className={gaya.intinya}>
          <strong>Intinya:</strong> {kartu.intinya}
        </p>
      )}
      <span className={gaya.tipe}>{LABEL_TIPE_ARTIKEL[kartu.tipe]}</span>
    </Tautan>
  )
}

export function DaftarKartu({ kartu }: { kartu: DataKartu[] }) {
  return (
    <ul className={gaya.daftar}>
      {kartu.map((k) => (
        <li key={k.id} data-masuk="">
          <KartuArtikel kartu={k} />
        </li>
      ))}
    </ul>
  )
}
