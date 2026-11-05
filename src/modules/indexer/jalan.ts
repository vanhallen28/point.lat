import type { Payload } from 'payload'

import { urlAbsolut } from '@/modules/seo/dokumen'

import { adapterIndexer, type AdapterIndexer } from './adapter'
import {
  ambilPengaturanIndexing,
  barisJatuhTempo,
  catatLog,
  kirimanBerhasilTerakhir,
  klaimBaris,
  panggilanSejak,
  perbaruiStatus,
  selesaikanBaris,
  tundaBaris,
  type BarisTersimpan,
} from './antrean'
import {
  awalHariPasifik,
  besokPasifik,
  JENDELA_KIRIM_MS,
  MENIT,
  PATH_SITEMAP,
  setelahPanggilan,
  statusDariInspeksi,
  tundaSampai,
  type Lanjutan,
} from './aturan'
import { pathFileKunci } from './kunci'
import { LABEL_STATUS_INDEKS, type HasilPanggilan, type NamaAdapter, type PengaturanIndexing, type StatusLog } from './tipe'

/** Baris paling banyak per jalan. Cron 10 menit sekali menghabiskan sisanya di jalan berikutnya. */
export const BATAS_PER_JALAN = 200

/** Sewa baris yang sedang dikirim; bila proses berhenti, baris dicoba lagi setelah sewa habis. */
const SEWA_MS = 10 * MENIT

/** IndexNow menerima paling banyak 10.000 URL per POST. */
const MAKS_URL_INDEXNOW = 10_000

export type RingkasanJalan = Record<StatusLog, number> & { diproses: number }

type Konteks = {
  payload: Payload
  adapter: AdapterIndexer
  pengaturan: PengaturanIndexing
  sekarang: Date
  ringkasan: RingkasanJalan
}

function pesanLanjutan(pesan: string, lanjut: Lanjutan, baris: BarisTersimpan, sekarang: Date): string {
  if (lanjut.log === 'diulang' && lanjut.berikut) {
    return `${pesan} Dicoba lagi ${Math.round((lanjut.berikut.jadwal.getTime() - sekarang.getTime()) / MENIT)} menit lagi.`
  }
  if (lanjut.log === 'ditunda') return `${pesan} Kuota harian Google habis; dicoba lagi setelah tengah malam waktu Pasifik.`
  if (lanjut.log === 'gagal') return `${pesan} Sudah dicoba ${baris.percobaan + 1} kali.`
  return pesan
}

/** Mencatat hasil satu baris ke log dan menyelesaikan atau menjadwalkan ulang barisnya. */
async function selesai(k: Konteks, baris: BarisTersimpan, hasil: HasilPanggilan, adapter: NamaAdapter, url: string, pesan = hasil.pesan): Promise<Lanjutan> {
  const lanjut = setelahPanggilan(baris, hasil, k.sekarang)
  await catatLog(k.payload, {
    url,
    jenis: baris.jenis,
    langkah: baris.langkah,
    adapter,
    status: lanjut.log,
    kodeHttp: 'kodeHttp' in hasil ? hasil.kodeHttp : null,
    pesan: pesanLanjutan(pesan, lanjut, baris, k.sekarang),
    percobaan: baris.percobaan + 1,
    waktu: k.sekarang,
  })
  await selesaikanBaris(k.payload, baris, lanjut.berikut)
  k.ringkasan[lanjut.log] += 1
  k.ringkasan.diproses += 1
  return lanjut
}

/** Langkah dengan jendela kirim: bila kiriman berhasil terakhir terlalu dekat, semua baris ditunda. */
async function tundaBilaDalamJendela(k: Konteks, langkah: 'sitemap' | 'indexnow', daftar: BarisTersimpan[]): Promise<boolean> {
  const sampai = tundaSampai(await kirimanBerhasilTerakhir(k.payload, langkah), JENDELA_KIRIM_MS[langkah], k.sekarang)
  if (!sampai) return false
  for (const baris of daftar) await tundaBaris(k.payload, baris, sampai)
  return true
}

const sewa = (k: Konteks) => new Date(k.sekarang.getTime() + SEWA_MS)

/** Langkah 2: sitemap index ke Search Console, paling sering sekali per 30 menit. */
async function kirimSitemap(k: Konteks, daftar: BarisTersimpan[]): Promise<void> {
  if (!daftar.length || (await tundaBilaDalamJendela(k, 'sitemap', daftar))) return
  const url = urlAbsolut(k.pengaturan, PATH_SITEMAP)
  for (const baris of await klaimBaris(k.payload, daftar, sewa(k))) {
    await selesai(k, baris, await k.adapter.searchConsole.kirimSitemap(k.pengaturan.propertiSearchConsole, url), k.adapter.searchConsole.nama, url)
  }
}

/** Langkah 3: semua URL yang antre dikirim dalam satu POST IndexNow, paling sering sekali per 5 menit. */
async function kirimIndexNow(k: Konteks, daftar: BarisTersimpan[]): Promise<void> {
  if (!daftar.length) return
  const kunci = k.pengaturan.kunciIndexNow
  if (kunci && (await tundaBilaDalamJendela(k, 'indexnow', daftar))) return
  const klaim = await klaimBaris(k.payload, daftar.slice(0, MAKS_URL_INDEXNOW), sewa(k))
  if (!klaim.length) return
  const url = (baris: BarisTersimpan) => urlAbsolut(k.pengaturan, baris.path)
  const hasil: HasilPanggilan = kunci
    ? await k.adapter.indexNow.kirim({
        host: new URL(k.pengaturan.urlSitus).host,
        key: kunci,
        keyLocation: urlAbsolut(k.pengaturan, pathFileKunci(kunci)),
        urlList: klaim.map(url),
      })
    : { status: 'dilewati', pesan: 'Kunci IndexNow belum diisi di Pengaturan SEO.' }
  for (const baris of klaim) await selesai(k, baris, hasil, k.adapter.indexNow.nama, url(baris))
}

/**
 * Langkah per URL dengan kuota harian Google (hari kuota mulai tengah malam waktu Pasifik). Baris di atas
 * kuota ditunda ke hari berikutnya dan dicatat sekali.
 */
async function kirimPerUrl(
  k: Konteks,
  daftar: BarisTersimpan[],
  kuota: number,
  nama: NamaAdapter,
  panggil: (baris: BarisTersimpan, url: string) => Promise<HasilPanggilan>,
  setelah?: (baris: BarisTersimpan, hasil: HasilPanggilan, lanjut: Lanjutan) => Promise<void>,
): Promise<void> {
  if (!daftar.length) return
  const terpakai = await panggilanSejak(k.payload, daftar[0].langkah, awalHariPasifik(k.sekarang))
  const sisa = Math.max(0, kuota - terpakai)
  for (const baris of daftar.slice(sisa)) {
    const besok = besokPasifik(k.sekarang)
    await catatLog(k.payload, {
      url: urlAbsolut(k.pengaturan, baris.path),
      jenis: baris.jenis,
      langkah: baris.langkah,
      adapter: nama,
      status: 'ditunda',
      pesan: `Batas ${kuota} panggilan per hari sudah tercapai; dicoba lagi setelah tengah malam waktu Pasifik.`,
      percobaan: baris.percobaan + 1,
      waktu: k.sekarang,
    })
    await tundaBaris(k.payload, baris, besok)
    if (baris.langkah === 'cek-status') await perbaruiStatus(k.payload, baris.path, { cekBerikutnya: besok.toISOString() })
    k.ringkasan.ditunda += 1
    k.ringkasan.diproses += 1
  }
  for (const baris of await klaimBaris(k.payload, daftar.slice(0, sisa), sewa(k))) {
    const url = urlAbsolut(k.pengaturan, baris.path)
    const hasil = await panggil(baris, url)
    let pesan = hasil.pesan
    if (hasil.status === 'berhasil' && baris.langkah === 'cek-status') {
      const { status, detail } = statusDariInspeksi(hasil.indeks)
      pesan = `${LABEL_STATUS_INDEKS[status]}${detail ? `: ${detail}` : ''}.`
    }
    const lanjut = await selesai(k, baris, hasil, nama, url, pesan)
    await setelah?.(baris, hasil, lanjut)
  }
}

/** Status indeks setelah cek: hasil Google, Error setelah gagal empat kali, dan jadwal cek berikutnya. */
async function catatHasilCek(k: Konteks, baris: BarisTersimpan, hasil: HasilPanggilan, lanjut: Lanjutan): Promise<void> {
  const cekBerikutnya = lanjut.berikut?.jadwal.toISOString() ?? null
  if (hasil.status === 'berhasil') {
    const { status, detail } = statusDariInspeksi(hasil.indeks)
    await perbaruiStatus(k.payload, baris.path, {
      status,
      detail,
      tautanInspeksi: hasil.indeks?.tautan ?? null,
      dirayapiPada: hasil.indeks?.lastCrawlTime ?? null,
      cekTerakhir: k.sekarang.toISOString(),
      cekBerikutnya,
    })
  } else if (lanjut.log === 'gagal') {
    await perbaruiStatus(k.payload, baris.path, { status: 'galat', detail: hasil.pesan, cekTerakhir: k.sekarang.toISOString(), cekBerikutnya })
  } else {
    await perbaruiStatus(k.payload, baris.path, { cekBerikutnya, ...(hasil.status === 'dilewati' ? { detail: hasil.pesan } : {}) })
  }
}

/**
 * Menjalankan antrean yang jatuh tempo (spesifikasi §8 langkah 2 sampai 6): sitemap, IndexNow, Indexing
 * API, lalu cek status, masing-masing dengan jendela kirim, kuota, dan jeda ulang dari `aturan.ts`.
 * Dipanggil cron setiap 10 menit dan lewat `after()` setelah konten terbit. Aman dipanggil berulang atau
 * bersamaan: baris diklaim sebelum dikirim, dan baris yang selesai dihapus.
 */
export async function jalankanIndexer(payload: Payload, opsi: { sekarang?: Date; adapter?: AdapterIndexer } = {}): Promise<RingkasanJalan> {
  const k: Konteks = {
    payload,
    adapter: opsi.adapter ?? adapterIndexer(),
    pengaturan: await ambilPengaturanIndexing(payload),
    sekarang: opsi.sekarang ?? new Date(),
    ringkasan: { diproses: 0, berhasil: 0, diulang: 0, gagal: 0, dilewati: 0, ditunda: 0 },
  }
  const jatuhTempo = await barisJatuhTempo(payload, k.sekarang, BATAS_PER_JALAN)
  const per = (langkah: BarisTersimpan['langkah']) => jatuhTempo.filter((b) => b.langkah === langkah)

  await kirimSitemap(k, per('sitemap'))
  await kirimIndexNow(k, per('indexnow'))
  const { googleIndexing, searchConsole } = k.adapter
  if (k.pengaturan.pakaiIndexingApi) {
    await kirimPerUrl(k, per('indexing-api'), k.pengaturan.kuotaIndexingApi, googleIndexing.nama, (baris, url) =>
      googleIndexing.kabari(url, baris.jenis === 'hapus' ? 'URL_DELETED' : 'URL_UPDATED'),
    )
  } else {
    for (const baris of await klaimBaris(payload, per('indexing-api'), sewa(k))) {
      await selesai(k, baris, { status: 'dilewati', pesan: 'Indexing API dimatikan di Pengaturan SEO.' }, googleIndexing.nama, urlAbsolut(k.pengaturan, baris.path))
    }
  }
  await kirimPerUrl(
    k,
    per('cek-status'),
    k.pengaturan.kuotaInspeksi,
    searchConsole.nama,
    (_baris, url) => searchConsole.periksaUrl(k.pengaturan.propertiSearchConsole, url),
    (baris, hasil, lanjut) => catatHasilCek(k, baris, hasil, lanjut),
  )
  return k.ringkasan
}
