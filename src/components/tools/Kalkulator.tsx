'use client'

import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from 'react'

import type { ToolId, WarnaPilar } from '@/lib/konstanta'
import { hitung, teksRibuan, type HasilBerhasil, type Isian, type Masukan, type ParameterTersimpan, type TeksIsian } from '@/modules/hitung'

import { barisAwal, FormKalkulator, idIsian } from './FormKalkulator'
import { HasilKalkulator } from './HasilKalkulator'
import gaya from './Kalkulator.module.css'

type Props = {
  id: string
  toolId: ToolId
  isian: Isian[]
  contoh: Masukan
  tombol: string
  lanjutan: string | null
  parameter: ParameterTersimpan[]
  teks: TeksIsian
  /** Hasil untuk contoh, dirender server; ditampilkan sampai pembaca menghitung sendiri. */
  hasilContoh: HasilBerhasil
  warna: WarnaPilar | null
}

/** Teks rupiah tanpa desimal ("8000000", "Rp 8.000.000") yang dirapikan saat isian ditinggalkan. `\s` mencakup spasi tak putus. */
const RUPIAH_POLOS = /^\s*(rp\.?)?\s*\d[\d.\s]*$/i

/**
 * Kalkulator di browser: membaca form, memanggil modul hitung dengan parameter dari CMS dan tanggal
 * hari ini, lalu menampilkan hasil atau galat. Galat tampil di bawah field (`aria-live`), fokus pindah
 * ke isian pertama yang salah, dan hasil diumumkan lewat `role="status"`. Validasi juga jalan saat
 * isian ditinggalkan; isian rupiah dirapikan saat itu.
 */
export function Kalkulator({ id, toolId, isian, contoh, tombol, lanjutan, parameter, teks, hasilContoh, warna }: Props) {
  const [hasil, setHasil] = useState(hasilContoh)
  const [urutan, setUrutan] = useState(0)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [baris, setBaris] = useState(() => barisAwal(isian))
  const [pengumuman, setPengumuman] = useState('')
  const kotakHasil = useRef<HTMLElement>(null)
  const fokusBerikut = useRef<string | null>(null)

  // Fokus dipindah setelah React menggambar ulang: ke baris baru, ke tombol tambah setelah baris
  // dihapus, atau ke isian salah pertama (bagian `<details>` yang menyimpannya dibuka dulu).
  useEffect(() => {
    const target = fokusBerikut.current
    if (!target) return
    fokusBerikut.current = null
    const el = document.getElementById(target)
    const lipat = el?.closest('details')
    if (lipat) lipat.open = true
    // Isian diletakkan di tengah layar supaya label dan pesan galatnya ikut terlihat.
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ block: 'center' })
  })

  const rupiah = new Set(isian.filter((i) => i.jenis === 'angka' && i.satuan === 'rupiah').map((i) => i.kunci))
  const kolom = new Set(isian.flatMap((i) => (i.jenis === 'baris' ? i.kolom.map((k) => k.kunci) : [])))

  /** Nilai form saat ini dalam bentuk yang dibaca modul hitung; kolom baris berupa daftar sesuai urutan baris. */
  function baca(form: HTMLFormElement): Masukan {
    const data = new FormData(form)
    const masukan: Masukan = {}
    for (const i of isian) {
      if (i.jenis === 'baris') for (const k of i.kolom) masukan[k.kunci] = data.getAll(k.kunci).map(String)
      else masukan[i.kunci] = String(data.get(i.kunci) ?? '')
    }
    return masukan
  }

  /** Id elemen untuk kunci galat (`gaji`, atau `sks.2` untuk baris ketiga). */
  function idUntuk(kunciGalat: string): string {
    const [kunci, posisi] = kunciGalat.split('.')
    if (posisi === undefined) return idIsian(id, kunci)
    const induk = isian.find((i) => i.jenis === 'baris' && i.kolom.some((k) => k.kunci === kunci))
    return idIsian(id, kunci, baris[induk?.kunci ?? '']?.[Number(posisi)] ?? 0)
  }

  function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const h = hitung(toolId, baca(e.currentTarget), new Date(), parameter, teks)
    if (!h.ok) {
      setGalat(h.galat)
      const jumlah = Object.keys(h.galat).length
      setPengumuman(h.pesan ?? `Periksa ${jumlah} isian yang ditandai.`)
      // Urutan kunci galat mengikuti urutan isian di form, jadi yang pertama adalah isian paling atas.
      const pertama = Object.keys(h.galat)[0]
      if (pertama) fokusBerikut.current = idUntuk(pertama)
      return
    }
    setGalat({})
    setHasil(h)
    setUrutan((u) => u + 1)
    setPengumuman(`${h.utama.label} ${h.utama.teks}. ${h.utama.keterangan ?? ''}`.trim())
    // Di HP hasil ada di bawah form: gulir sampai hasil terlihat.
    const kotak = kotakHasil.current
    if (kotak && kotak.getBoundingClientRect().top > window.innerHeight - 160) {
      const tenang = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      kotak.scrollIntoView({ behavior: tenang ? 'auto' : 'smooth', block: 'start' })
    }
  }

  function tinggalkan(e: FocusEvent<HTMLFormElement>) {
    const el = e.target
    if (!(el instanceof HTMLInputElement) || el.type !== 'text') return
    if (rupiah.has(el.name) && RUPIAH_POLOS.test(el.value)) el.value = teksRibuan(Number(el.value.replace(/\D/g, '')))
    const kunciGalat = kolom.has(el.name)
      ? `${el.name}.${[...e.currentTarget.querySelectorAll(`[name="${el.name}"]`)].indexOf(el)}`
      : el.name
    // Isian kosong yang belum pernah salah tidak langsung ditandai saat dilewati dengan Tab.
    if (el.value.trim() === '' && !galat[kunciGalat]) return
    const h = hitung(toolId, baca(e.currentTarget), new Date(), parameter, teks)
    const pesan = h.ok ? undefined : h.galat[kunciGalat]
    setGalat((lama) => {
      const baru = { ...lama }
      if (pesan) baru[kunciGalat] = pesan
      else delete baru[kunciGalat]
      return baru
    })
  }

  /** Galat baris memakai posisi baris, jadi dibuang saat baris bertambah atau berkurang. */
  const tanpaGalatBaris = () => setGalat((lama) => Object.fromEntries(Object.entries(lama).filter(([k]) => !kolom.has(k.split('.')[0]))))

  function tambah(kunci: string) {
    const induk = isian.find((i) => i.kunci === kunci)
    if (induk?.jenis !== 'baris') return
    const baru = Math.max(-1, ...baris[kunci]) + 1
    setBaris((lama) => ({ ...lama, [kunci]: [...lama[kunci], baru] }))
    tanpaGalatBaris()
    fokusBerikut.current = idIsian(id, induk.kolom[0].kunci, baru)
  }

  function hapus(kunci: string, idBaris: number) {
    setBaris((lama) => ({ ...lama, [kunci]: lama[kunci].filter((b) => b !== idBaris) }))
    tanpaGalatBaris()
    fokusBerikut.current = `${idIsian(id, kunci)}-tambah`
  }

  return (
    <div className={gaya.kalkulator} data-warna={warna ?? undefined}>
      <FormKalkulator
        id={id}
        isian={isian}
        nilai={contoh}
        galat={galat}
        tombol={tombol}
        lanjutan={lanjutan}
        baris={baris}
        onSubmit={kirim}
        onBlur={tinggalkan}
        onTambah={tambah}
        onHapus={hapus}
      />
      <HasilKalkulator ref={kotakHasil} id={id} hasil={hasil} baru={urutan > 0} tombol={tombol} urutan={urutan} />
      <p className="sr" role="status">
        {pengumuman}
      </p>
    </div>
  )
}
