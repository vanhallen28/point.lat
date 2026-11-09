import type { KodeSematan as DokKodeSematan } from '@/payload-types'

import { ID_DATA_SEMATAN, JENIS_SEMATAN, POSISI_SEMATAN, type KodeTerpasang } from './tipe'

/** Nama cookie yang sah (token HTTP), boleh diakhiri `*` untuk awalan, misalnya `_ga_*`. */
const POLA_NAMA_KUKI = /^[A-Za-z0-9!#$%&'+.^_`|~-]+\*?$/

/** Isian "Cookie yang dipakai" menjadi daftar nama (dipisah koma atau spasi), tanpa duplikat. */
export function pecahKuki(nilai: string | null | undefined): string[] {
  return [...new Set((nilai ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))]
}

/** Validasi field `kuki`: semua nama harus nama cookie yang sah. */
export function validasiKuki(nilai: unknown): true | string {
  if (nilai == null || nilai === '') return true
  if (typeof nilai !== 'string') return 'Isi dengan nama cookie, dipisah koma.'
  const salah = pecahKuki(nilai).filter((n) => !POLA_NAMA_KUKI.test(n))
  return salah.length ? `Nama cookie tidak sah: ${salah.join(', ')}. Pakai huruf, angka, dan tanda _ atau -, boleh diakhiri *.` : true
}

/** Nama cookie cocok dengan pola (nama persis, atau awalan bila pola diakhiri `*`). */
export function cocokKuki(nama: string, pola: string): boolean {
  return pola.endsWith('*') ? nama.startsWith(pola.slice(0, -1)) : nama === pola
}

/**
 * Kode yang dipasang di situs dari global `kode-sematan`: hanya yang aktif dan berisi kode. Kode "Butuh
 * persetujuan" hanya bila halaman Kebijakan Privasi terbit, sama dengan iklan (spesifikasi §11, §23), karena
 * banner persetujuan menautkannya.
 */
export function susunKode(doc: Partial<DokKodeSematan> | null | undefined, kebijakanTerbit: boolean): KodeTerpasang[] {
  return (doc?.kode ?? [])
    .filter((k) => k.aktif !== false && (k.kode ?? '').trim() !== '')
    .filter((k) => POSISI_SEMATAN.includes(k.posisi) && JENIS_SEMATAN.includes(k.jenis))
    .filter((k) => k.jenis === 'wajib' || kebijakanTerbit)
    .map((k, i) => ({ id: k.id ?? String(i), nama: k.nama.trim(), posisi: k.posisi, jenis: k.jenis, kode: k.kode.trim(), kuki: pecahKuki(k.kuki) }))
}

/** Ada kode yang menunggu persetujuan: banner persetujuan perlu tampil dan Consent Mode membuka analitik. */
export function butuhPersetujuan(kode: readonly KodeTerpasang[]): boolean {
  return kode.some((k) => k.jenis === 'persetujuan')
}

/** Nama layanan yang menunggu persetujuan (nama kode di admin), untuk teks banner. */
export function layananPersetujuan(kode: readonly KodeTerpasang[]): string[] {
  return [...new Set(kode.filter((k) => k.jenis === 'persetujuan').map((k) => k.nama).filter((n): n is string => Boolean(n)))]
}

/** Data kode untuk `<script type="application/json">`: `<` di-escape supaya isi kode tidak menutup elemen. */
export function serialisasiKode(kode: readonly KodeTerpasang[]): string {
  return JSON.stringify(kode).replace(/</g, '\\u003c')
}

/**
 * Pemuat kode sematan, skrip sebaris di akhir `<body>` (tanpa berkas JS tambahan). Membaca data JSON, lalu
 * memasang setiap kode di posisinya: kode Wajib langsung, kode Butuh persetujuan hanya bila
 * `<html data-persetujuan="semua">` (ditulis skrip awal dari cookie) atau setelah peristiwa `persetujuan`
 * (pengunjung memilih Izinkan semua). Elemen `<script>` dibuat ulang supaya browser menjalankannya (skrip
 * dari `innerHTML` tidak berjalan); skrip eksternal memakai `async=false` supaya urutannya terjaga.
 */
export function skripSematan(): string {
  return [
    '(function(){',
    `var d=document,w=window,el=d.getElementById('${ID_DATA_SEMATAN}');if(!el)return;`,
    'var daftar;try{daftar=JSON.parse(el.textContent||"[]")}catch(e){return}',
    'var sudah={};',
    'function baru(n){var s=d.createElement("script");for(var i=0;i<n.attributes.length;i++){var a=n.attributes[i];s.setAttribute(a.name,a.value)}',
    'if(s.src)s.async=n.hasAttribute("async");s.text=n.text||n.textContent||"";return s}',
    'function siapkan(n){if(n.nodeName==="SCRIPT")return baru(n);',
    'if(n.querySelectorAll){var x=n.querySelectorAll("script");for(var i=0;i<x.length;i++)x[i].parentNode.replaceChild(baru(x[i]),x[i])}return n}',
    'function pasang(k){if(sudah[k.id])return;sudah[k.id]=1;var t=d.createElement("template");t.innerHTML=k.kode;',
    'var tujuan=k.posisi==="head"?d.head:d.body,acuan=k.posisi==="bodyAwal"?d.body.firstChild:null,n=[].slice.call(t.content.childNodes);',
    'for(var i=0;i<n.length;i++)tujuan.insertBefore(siapkan(n[i]),acuan)}',
    'function jalan(){var s=d.documentElement.getAttribute("data-persetujuan");for(var i=0;i<daftar.length;i++){var k=daftar[i];if(k.jenis==="wajib"||s==="semua")pasang(k)}}',
    'jalan();w.addEventListener("persetujuan",jalan)',
    '})()',
  ].join('')
}
