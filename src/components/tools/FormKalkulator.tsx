import type { FocusEventHandler, FormEventHandler } from 'react'

import { Ikon } from '@/components/dasar/Ikon'
import type { Isian, IsianAngka, IsianBaris, IsianCentang, IsianPilihan, Masukan, Satuan } from '@/modules/hitung'

import gaya from './Kalkulator.module.css'

/** Simbol di dalam kotak isian (disembunyikan dari pembaca layar) dan teks yang dibacakan sebagai gantinya. */
const SATUAN: Partial<Record<Satuan, { simbol: string; dibaca: string; depan?: boolean }>> = {
  rupiah: { simbol: 'Rp', dibaca: 'dalam rupiah', depan: true },
  persen: { simbol: '%', dibaca: 'dalam persen' },
  kg: { simbol: 'kg', dibaca: 'dalam kilogram' },
  cm: { simbol: 'cm', dibaca: 'dalam sentimeter' },
  tahun: { simbol: 'tahun', dibaca: 'dalam tahun' },
  bulan: { simbol: 'bulan', dibaca: 'dalam bulan' },
}

/** Sampai 4 pilihan tampil sebagai tombol radio supaya label panjang tetap terbaca; lebih dari itu sebagai daftar. */
export const MAKS_RADIO = 4

/** Id elemen isian; isian baris memakai id barisnya. Dipakai juga untuk memindahkan fokus ke isian yang salah. */
export const idIsian = (idForm: string, kunci: string, idBaris?: number) => (idBaris === undefined ? `${idForm}-${kunci}` : `${idForm}-${kunci}-${idBaris}`)

/** Id baris awal setiap isian baris: 0 sampai jumlah contoh dikurangi 1, sesuai urutan nilai awal. */
export function barisAwal(isian: Isian[]): Record<string, number[]> {
  return Object.fromEntries(isian.filter((i): i is IsianBaris => i.jenis === 'baris').map((i) => [i.kunci, i.contoh.map((_, n) => n)]))
}

export type PropsForm = {
  id: string
  isian: Isian[]
  /** Nilai awal isian (input tidak dikendalikan React; nilai terbaru dibaca dari form). */
  nilai: Masukan
  galat: Record<string, string>
  tombol: string
  lanjutan: string | null
  baris: Record<string, number[]>
  onSubmit?: FormEventHandler<HTMLFormElement>
  onBlur?: FocusEventHandler<HTMLFormElement>
  onTambah?: (kunci: string) => void
  onHapus?: (kunci: string, idBaris: number) => void
}

function Galat({ id, pesan }: { id: string; pesan?: string }) {
  return (
    <p id={id} className={gaya.galat} aria-live="polite">
      {pesan && (
        <>
          <Ikon nama="triangle-alert" ukuran={18} />
          {pesan}
        </>
      )}
    </p>
  )
}

const keterangan = (...id: (string | false | null)[]) => id.filter(Boolean).join(' ')

type PropsKotak = { id: string; nilai: string; galat?: string; describedBy: string; labelledBy?: string }

function KotakAngka({ i, id, nilai, galat, describedBy, labelledBy }: PropsKotak & { i: IsianAngka }) {
  const satuan = SATUAN[i.satuan]
  return (
    <div className={gaya.kotak}>
      {satuan?.depan && (
        <span className={gaya.satuan} aria-hidden="true">
          {satuan.simbol}
        </span>
      )}
      <input
        id={id}
        name={i.kunci}
        type="text"
        inputMode={i.desimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        defaultValue={nilai}
        required={i.wajib}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={galat ? true : undefined}
      />
      {satuan && !satuan.depan && (
        <span className={gaya.satuan} aria-hidden="true">
          {satuan.simbol}
        </span>
      )}
    </div>
  )
}

function Daftar({ i, id, nilai, galat, describedBy, labelledBy, kosong }: PropsKotak & { i: IsianPilihan; kosong?: boolean }) {
  return (
    <div className={gaya.pilih}>
      <select
        id={id}
        name={i.kunci}
        defaultValue={nilai}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={galat ? true : undefined}
      >
        {kosong && <option value="">Pilih</option>}
        {i.opsi.map((o) => (
          <option key={o.nilai} value={o.nilai}>
            {o.label}
          </option>
        ))}
      </select>
      <Ikon nama="chevron-down" className={gaya.panah} />
    </div>
  )
}

function Bantuan({ id, teks }: { id: string; teks: string | null }) {
  return teks ? (
    <p id={`${id}-bantuan`} className={gaya.bantuan}>
      {teks}
    </p>
  ) : null
}

function IsianTunggal({ i, idForm, nilai, galat }: { i: IsianAngka | IsianPilihan | IsianCentang; idForm: string; nilai: Masukan; galat: Record<string, string> }) {
  const id = idIsian(idForm, i.kunci)
  const teks = typeof nilai[i.kunci] === 'string' ? (nilai[i.kunci] as string) : ''
  if (i.jenis === 'centang') {
    return (
      <div className={gaya.isian}>
        <label className={gaya.opsiItem}>
          <input id={id} type="checkbox" name={i.kunci} value="ya" defaultChecked={teks === 'ya'} aria-describedby={i.bantuan ? `${id}-bantuan` : undefined} />
          <span>{i.label}</span>
        </label>
        <Bantuan id={id} teks={i.bantuan} />
      </div>
    )
  }
  if (i.jenis === 'pilihan' && i.tampilan === 'kisi') {
    return (
      <fieldset className={gaya.isian} aria-describedby={keterangan(Boolean(i.bantuan) && `${id}-bantuan`, `${id}-galat`)}>
        <legend className={gaya.label}>{i.label}</legend>
        <Bantuan id={id} teks={i.bantuan} />
        <div className={gaya.kisi}>
          {i.opsi.map((o, n) => (
            <label key={o.nilai} className={gaya.kisiItem}>
              <input id={n === 0 ? id : `${id}-${n}`} type="radio" name={i.kunci} value={o.nilai} defaultChecked={o.nilai === teks} />
              <span aria-hidden="true">{o.nilai}</span>
              <span className="sr">{o.label}</span>
            </label>
          ))}
        </div>
        <Galat id={`${id}-galat`} pesan={galat[i.kunci]} />
      </fieldset>
    )
  }
  if (i.jenis === 'pilihan' && i.opsi.length <= MAKS_RADIO) {
    return (
      <fieldset className={gaya.isian} aria-describedby={keterangan(Boolean(i.bantuan) && `${id}-bantuan`, `${id}-galat`)}>
        <legend className={gaya.label}>{i.label}</legend>
        <Bantuan id={id} teks={i.bantuan} />
        <div className={gaya.opsi}>
          {i.opsi.map((o, n) => (
            <label key={o.nilai} className={gaya.opsiItem}>
              <input id={n === 0 ? id : `${id}-${n}`} type="radio" name={i.kunci} value={o.nilai} defaultChecked={o.nilai === teks} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <Galat id={`${id}-galat`} pesan={galat[i.kunci]} />
      </fieldset>
    )
  }
  const satuan = i.jenis === 'angka' ? SATUAN[i.satuan] : undefined
  const describedBy = keterangan(Boolean(i.bantuan) && `${id}-bantuan`, `${id}-galat`)
  return (
    <div className={gaya.isian}>
      <label htmlFor={id} className={gaya.label}>
        {i.label}
        {satuan && <span className="sr"> {satuan.dibaca}</span>}
      </label>
      <Bantuan id={id} teks={i.bantuan} />
      {i.jenis === 'angka' ? (
        <KotakAngka i={i} id={id} nilai={teks} galat={galat[i.kunci]} describedBy={describedBy} />
      ) : (
        <Daftar i={i} id={id} nilai={teks} galat={galat[i.kunci]} describedBy={describedBy} />
      )}
      <Galat id={`${id}-galat`} pesan={galat[i.kunci]} />
    </div>
  )
}

function IsianDaftarBaris({ i, idForm, nilai, galat, baris, onTambah, onHapus }: { i: IsianBaris; idForm: string } & Pick<PropsForm, 'nilai' | 'galat' | 'baris' | 'onTambah' | 'onHapus'>) {
  const [kolomAngka, kolomPilihan] = i.kolom
  const daftar = baris[i.kunci] ?? []
  const awal = (kunci: string, idBaris: number) => (nilai[kunci] as string[] | undefined)?.[idBaris] ?? ''
  const id = idIsian(idForm, i.kunci)
  const nama = i.labelBaris.toLowerCase()
  return (
    <fieldset className={gaya.isian} aria-describedby={i.bantuan ? `${id}-bantuan` : undefined}>
      <legend className={gaya.label}>{i.label}</legend>
      <Bantuan id={id} teks={i.bantuan} />
      <ol className={gaya.daftarBaris}>
        {daftar.map((idBaris, n) => {
          const judul = `${id}-${idBaris}-judul`
          const idAngka = idIsian(idForm, kolomAngka.kunci, idBaris)
          const idPilihan = idIsian(idForm, kolomPilihan.kunci, idBaris)
          const pesan = [galat[`${kolomAngka.kunci}.${n}`], galat[`${kolomPilihan.kunci}.${n}`]].filter(Boolean).join(' ')
          const idGalat = `${id}-${idBaris}-galat`
          return (
            <li key={idBaris} className={gaya.baris}>
              <span id={judul} className={gaya.judulBaris}>
                {i.labelBaris} {n + 1}
              </span>
              <div className={gaya.selAngka}>
                <label id={`${idAngka}-label`} htmlFor={idAngka} className={gaya.labelKecil}>
                  {kolomAngka.label}
                </label>
                <KotakAngka
                  i={kolomAngka}
                  id={idAngka}
                  nilai={awal(kolomAngka.kunci, idBaris)}
                  galat={galat[`${kolomAngka.kunci}.${n}`]}
                  describedBy={idGalat}
                  labelledBy={`${judul} ${idAngka}-label`}
                />
              </div>
              <div className={gaya.selPilihan}>
                <label id={`${idPilihan}-label`} htmlFor={idPilihan} className={gaya.labelKecil}>
                  {kolomPilihan.label}
                </label>
                <Daftar
                  i={kolomPilihan}
                  id={idPilihan}
                  nilai={awal(kolomPilihan.kunci, idBaris)}
                  galat={galat[`${kolomPilihan.kunci}.${n}`]}
                  describedBy={idGalat}
                  labelledBy={`${judul} ${idPilihan}-label`}
                  kosong
                />
              </div>
              <button
                type="button"
                className={gaya.hapus}
                aria-label={`Hapus ${nama} ${n + 1}`}
                disabled={daftar.length === 1}
                onClick={onHapus ? () => onHapus(i.kunci, idBaris) : undefined}
              >
                <Ikon nama="x" />
              </button>
              {/* Satu pesan galat per baris; kedua kolom merujuknya. */}
              <Galat id={idGalat} pesan={pesan} />
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        id={`${id}-tambah`}
        className={gaya.tambah}
        disabled={daftar.length >= i.maks}
        onClick={onTambah ? () => onTambah(i.kunci) : undefined}
      >
        <Ikon nama="plus" />
        Tambah {nama}
      </button>
    </fieldset>
  )
}

/**
 * Form kalkulator dari definisi isian modul hitung. Input tidak dikendalikan React: nilai awal dari
 * contoh, nilai terbaru dibaca dari form saat dikirim. Tanpa JavaScript form tetap tampil lengkap
 * (hasil contoh dirender server); `Kalkulator` memasang perilakunya. Isian tambahan ada di `<details>`.
 */
export function FormKalkulator({ id, isian, nilai, galat, tombol, lanjutan, baris, onSubmit, onBlur, onTambah, onHapus }: PropsForm) {
  const tampil = (i: Isian) =>
    i.jenis === 'baris' ? (
      <IsianDaftarBaris key={i.kunci} i={i} idForm={id} nilai={nilai} galat={galat} baris={baris} onTambah={onTambah} onHapus={onHapus} />
    ) : (
      <IsianTunggal key={i.kunci} i={i} idForm={id} nilai={nilai} galat={galat} />
    )
  const tambahan = isian.filter((i) => i.lanjutan)
  return (
    <form id={id} className={gaya.form} noValidate onSubmit={onSubmit} onBlur={onBlur}>
      {isian.filter((i) => !i.lanjutan).map(tampil)}
      {tambahan.length > 0 && (
        <details className={gaya.lanjutan}>
          <summary>
            {lanjutan ?? 'Isian lain'}
            <Ikon nama="chevron-down" className={gaya.panah} />
          </summary>
          <div className={gaya.lanjutanIsi}>{tambahan.map(tampil)}</div>
        </details>
      )}
      <button type="submit" className={gaya.tombol}>
        {tombol}
      </button>
      <noscript>
        <p className={gaya.tanpaJs}>Kalkulator ini butuh JavaScript untuk menghitung angkamu. Hasil yang tampil memakai angka contoh di form.</p>
      </noscript>
    </form>
  )
}
