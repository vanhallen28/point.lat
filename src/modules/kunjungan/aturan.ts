import { createHmac } from 'crypto'

/**
 * Aturan statistik kunjungan (spesifikasi §26) sebagai fungsi murni: membaca kiriman beacon, mengenali bot,
 * perangkat, peramban, dan sumber kunjungan, sidik pengunjung harian tanpa IP mentah, rentang tanggal laporan,
 * dan isi CSV. Waktu selalu argumen supaya bisa diuji.
 */

export const ZONA = 'Asia/Jakarta'
const SEHARI_MS = 86_400_000
const SELISIH_WIB_MS = 7 * 3_600_000

/** Ukuran isian beacon paling besar (path, perujuk, dan utm_source). */
export const MAKS_ISIAN = 1024
/** Tayangan paling banyak per sidik per menit; selebihnya diabaikan (muat ulang beruntun atau skrip nakal). */
export const MAKS_PER_MENIT = 30
/** Tayangan paling banyak per hari untuk seluruh situs, pelindung kapasitas database. */
export const MAKS_TAYANGAN_HARIAN = 50_000
/** Baris kunjungan mentah disimpan 13 bulan; total harian (`kunjungan-harian`) disimpan selamanya. */
export const SIMPAN_HARI = 400
/** Pengunjung dihitung "sedang online" bila membuka halaman dalam 5 menit terakhir. */
export const MENIT_ONLINE = 5
/** Rentang laporan paling panjang. */
export const MAKS_RENTANG_HARI = 400

export type Kanal = 'pencarian' | 'sosial' | 'ai' | 'langsung' | 'rujukan' | 'kampanye' | 'internal'
export type Perangkat = 'hp' | 'tablet' | 'desktop'

export const LABEL_KANAL: Record<Kanal, string> = {
  pencarian: 'Mesin pencari',
  sosial: 'Media sosial',
  ai: 'Asisten AI',
  langsung: 'Langsung',
  rujukan: 'Situs lain',
  kampanye: 'Kampanye (utm)',
  internal: 'Dari halaman point.',
}

export const LABEL_PERANGKAT: Record<Perangkat, string> = { hp: 'HP', tablet: 'Tablet', desktop: 'Desktop' }

/** Tanggal kalender WIB `YYYY-MM-DD`. */
export function tanggalWib(t: Date): string {
  return new Date(t.getTime() + SELISIH_WIB_MS).toISOString().slice(0, 10)
}

/** Tanggal `YYYY-MM-DD` digeser `hari` (kalender, tanpa zona). */
export function geserTanggal(tanggal: string, hari: number): string {
  return new Date(Date.parse(`${tanggal}T00:00:00.000Z`) + hari * SEHARI_MS).toISOString().slice(0, 10)
}

/** Jumlah hari kalender dari `dari` sampai `sampai`, keduanya ikut dihitung. */
export function panjangRentang(dari: string, sampai: string): number {
  return Math.round((Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / SEHARI_MS) + 1
}

/** Semua tanggal dari `dari` sampai `sampai`. */
export function daftarTanggal(dari: string, sampai: string): string[] {
  const n = panjangRentang(dari, sampai)
  return Array.from({ length: Math.max(n, 0) }, (_, i) => geserTanggal(dari, i))
}

const POLA_BOT =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|scrapy|httpclient|phantom|puppeteer|playwright|selenium/i

/** Permintaan dari bot, perambah, pratinjau tautan, atau alat otomatis (termasuk peramban tanpa UA). */
export function apakahBot(ua: string | null | undefined): boolean {
  return !ua || ua.length < 20 || POLA_BOT.test(ua)
}

export function jenisPerangkat(ua: string): Perangkat {
  if (/ipad|tablet|(android(?!.*mobile))|kindle|silk/i.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android|opera mini|iemobile/i.test(ua)) return 'hp'
  return 'desktop'
}

/** Nama peramban dari UA; urutan penting karena Edge, Opera, dan Samsung Internet juga menulis "Chrome". */
export function namaPeramban(ua: string): string {
  if (/edg(e|a|ios)?\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet'
  if (/ucbrowser/i.test(ua)) return 'UC Browser'
  if (/miuibrowser|xiaomi/i.test(ua)) return 'Mi Browser'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/chrome|crios|chromium/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Lainnya'
}

type PolaSumber = { pola: RegExp; nama: string; kanal: Exclude<Kanal, 'langsung' | 'internal' | 'kampanye'> }

/** Domain perujuk yang dikenal; asisten AI dicek sebelum Google karena Gemini memakai domain google.com. */
const SUMBER_DIKENAL: PolaSumber[] = [
  { pola: /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$/, nama: 'ChatGPT', kanal: 'ai' },
  { pola: /(^|\.)perplexity\.ai$/, nama: 'Perplexity', kanal: 'ai' },
  { pola: /^gemini\.google\.com$/, nama: 'Gemini', kanal: 'ai' },
  { pola: /(^|\.)copilot\.microsoft\.com$/, nama: 'Copilot', kanal: 'ai' },
  { pola: /(^|\.)claude\.ai$/, nama: 'Claude', kanal: 'ai' },
  { pola: /(^|\.)(deepseek\.com|meta\.ai)$/, nama: 'Asisten AI lain', kanal: 'ai' },
  { pola: /(^|\.)google\.[a-z.]+$/, nama: 'Google', kanal: 'pencarian' },
  { pola: /(^|\.)bing\.com$/, nama: 'Bing', kanal: 'pencarian' },
  { pola: /(^|\.)(yahoo\.com|search\.yahoo\.co\.jp)$/, nama: 'Yahoo', kanal: 'pencarian' },
  { pola: /(^|\.)duckduckgo\.com$/, nama: 'DuckDuckGo', kanal: 'pencarian' },
  { pola: /(^|\.)(yandex\.[a-z]+|ecosia\.org|baidu\.com|naver\.com|brave\.com)$/, nama: 'Mesin pencari lain', kanal: 'pencarian' },
  { pola: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/, nama: 'Facebook', kanal: 'sosial' },
  { pola: /(^|\.)instagram\.com$/, nama: 'Instagram', kanal: 'sosial' },
  { pola: /(^|\.)(t\.co|x\.com|twitter\.com)$/, nama: 'X', kanal: 'sosial' },
  { pola: /(^|\.)tiktok\.com$/, nama: 'TikTok', kanal: 'sosial' },
  { pola: /(^|\.)(youtube\.com|youtu\.be)$/, nama: 'YouTube', kanal: 'sosial' },
  { pola: /(^|\.)(linkedin\.com|lnkd\.in)$/, nama: 'LinkedIn', kanal: 'sosial' },
  { pola: /(^|\.)threads\.(net|com)$/, nama: 'Threads', kanal: 'sosial' },
  { pola: /(^|\.)(wa\.me|whatsapp\.com)$/, nama: 'WhatsApp', kanal: 'sosial' },
  { pola: /(^|\.)(t\.me|telegram\.org)$/, nama: 'Telegram', kanal: 'sosial' },
  { pola: /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, nama: 'Pinterest', kanal: 'sosial' },
  { pola: /(^|\.)reddit\.com$/, nama: 'Reddit', kanal: 'sosial' },
]

/**
 * Perujuk aplikasi Android (`android-app://paket/`), misalnya aplikasi Google (Discover dan penelusuran) yang membuka
 * artikel di Chrome Custom Tabs. Dicocokkan nama paketnya, terpisah dari domain web supaya Gmail atau YouTube tidak
 * terbaca sebagai penelusuran Google.
 */
const APLIKASI_DIKENAL: PolaSumber[] = [
  { pola: /^com\.google\.android\.googlequicksearchbox$/, nama: 'Google', kanal: 'pencarian' },
  { pola: /^com\.google\.android\.apps\.bard$/, nama: 'Gemini', kanal: 'ai' },
  { pola: /^com\.openai\.chatgpt$/, nama: 'ChatGPT', kanal: 'ai' },
  { pola: /^com\.google\.android\.youtube$/, nama: 'YouTube', kanal: 'sosial' },
  { pola: /^com\.facebook\.(katana|lite|orca)$/, nama: 'Facebook', kanal: 'sosial' },
  { pola: /^com\.instagram\.android$/, nama: 'Instagram', kanal: 'sosial' },
  { pola: /^com\.(twitter|x)\.android$/, nama: 'X', kanal: 'sosial' },
  { pola: /^(com\.zhiliaoapp\.musically|com\.ss\.android\.ugc\.trill)$/, nama: 'TikTok', kanal: 'sosial' },
  { pola: /^com\.linkedin\.android$/, nama: 'LinkedIn', kanal: 'sosial' },
  { pola: /^com\.whatsapp(\.w4b)?$/, nama: 'WhatsApp', kanal: 'sosial' },
  { pola: /^(org\.telegram\.messenger|org\.thunderdog\.challegram)$/, nama: 'Telegram', kanal: 'sosial' },
  { pola: /^com\.google\.android\.gm$/, nama: 'Gmail', kanal: 'rujukan' },
]

const UTM_SOSIAL = /^(facebook|fb|instagram|ig|x|twitter|tiktok|youtube|linkedin|threads|whatsapp|wa|telegram|pinterest)$/

export type Sumber = { kanal: Kanal; sumber: string; perujuk: string | null }

/** Host tanpa `www.` dan huruf kecil, atau `null` bila bukan URL http(s). */
export function hostDari(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Kanal dan nama sumber satu tayangan. `utm_source` mengalahkan perujuk (tautan kampanye di media sosial atau
 * newsletter); perujuk aplikasi Android dicocokkan nama paketnya; tanpa perujuk berarti langsung (diketik, markah,
 * aplikasi chat); perujuk dari situs sendiri berarti pindah halaman di dalam point.
 */
export function sumberKunjungan(perujuk: string | null, utm: string | null, hostSitus: readonly string[]): Sumber {
  const kampanye = utm?.trim().toLowerCase().slice(0, 40)
  if (kampanye) {
    const kenal = SUMBER_DIKENAL.find((s) => s.nama.toLowerCase() === kampanye)
    if (kenal) return { kanal: kenal.kanal, sumber: kenal.nama, perujuk: hostDari(perujuk) }
    if (UTM_SOSIAL.test(kampanye)) return { kanal: 'sosial', sumber: kampanye[0].toUpperCase() + kampanye.slice(1), perujuk: hostDari(perujuk) }
    return { kanal: 'kampanye', sumber: kampanye, perujuk: hostDari(perujuk) }
  }
  const aplikasi = /^android-app:\/\/([a-z0-9_.]{3,100})/i.exec(perujuk ?? '')?.[1]?.toLowerCase()
  if (aplikasi) {
    const kenal = APLIKASI_DIKENAL.find((s) => s.pola.test(aplikasi))
    return kenal ? { kanal: kenal.kanal, sumber: kenal.nama, perujuk: aplikasi } : { kanal: 'rujukan', sumber: aplikasi, perujuk: aplikasi }
  }
  const host = hostDari(perujuk)
  if (!host) return { kanal: 'langsung', sumber: 'Langsung', perujuk: null }
  if (hostSitus.some((h) => h.replace(/^www\./, '') === host)) return { kanal: 'internal', sumber: 'point.', perujuk: host }
  const kenal = SUMBER_DIKENAL.find((s) => s.pola.test(host))
  if (kenal) return { kanal: kenal.kanal, sumber: kenal.nama, perujuk: host }
  return { kanal: 'rujukan', sumber: host, perujuk: host }
}

/** Path halaman publik yang dicatat, atau `null` (admin, API, aset, path cacat). Query dan fragmen dibuang. */
export function rapikanPath(nilai: unknown): string | null {
  if (typeof nilai !== 'string') return null
  const path = nilai.split(/[?#]/)[0]
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 300 || /[\s\\\u0000-\u001f]/.test(path)) return null
  if (/^\/(admin|api|_next)(\/|$)/.test(path)) return null
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export type Kiriman = { path: string; perujuk: string | null; utm: string | null }

/** Isian beacon `{ p, r, s }` (path, perujuk, utm_source), atau `null` bila tidak sah. */
export function bacaKiriman(teks: string): Kiriman | null {
  if (!teks || teks.length > MAKS_ISIAN) return null
  let data: unknown
  try {
    data = JSON.parse(teks)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const { p, r, s } = data as Record<string, unknown>
  const path = rapikanPath(p)
  if (!path) return null
  return {
    path,
    perujuk: typeof r === 'string' && r ? r.slice(0, 500) : null,
    utm: typeof s === 'string' && s ? s.slice(0, 60) : null,
  }
}

/**
 * Sidik pengunjung harian: HMAC-SHA256 dari tanggal WIB, IP, dan user agent dengan rahasia server. IP mentah tidak
 * disimpan, sidik berganti setiap hari sehingga pengunjung tidak bisa dilacak antarhari, dan user agent memisahkan
 * perangkat yang berbagi IP (CGNAT operator seluler).
 */
export function sidikKunjungan(ip: string | null, ua: string, rahasia: string, tanggal: string): string {
  return createHmac('sha256', rahasia).update(`kunjungan|${tanggal}|${ip ?? 'tanpa-ip'}|${ua}`).digest('hex').slice(0, 24)
}

/** Kode negara ISO 2 huruf dari header geolokasi Vercel, atau `null`. */
export function rapikanNegara(nilai: string | null): string | null {
  const kode = nilai?.trim().toUpperCase()
  return kode && /^[A-Z]{2}$/.test(kode) && kode !== 'XX' ? kode : null
}

/** Nama kota dari header `x-vercel-ip-city` (dikodekan URL), atau `null`. */
export function rapikanKota(nilai: string | null): string | null {
  if (!nilai) return null
  try {
    const kota = decodeURIComponent(nilai).trim()
    return kota && kota.length <= 80 && !/[\u0000-\u001f]/.test(kota) ? kota : null
  } catch {
    return null
  }
}

const NAMA_NEGARA = new Intl.DisplayNames(['id'], { type: 'region' })

/** Nama negara bahasa Indonesia ("Indonesia", "Singapura"), atau "Tidak diketahui". */
export function namaNegara(kode: string | null): string {
  if (!kode) return 'Tidak diketahui'
  try {
    return NAMA_NEGARA.of(kode) ?? kode
  } catch {
    return kode
  }
}

/** Emoji bendera dari kode negara (dekoratif). */
export function benderaNegara(kode: string | null): string {
  if (!kode || !/^[A-Z]{2}$/.test(kode)) return ''
  return String.fromCodePoint(...[...kode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

// Rentang laporan --------------------------------------------------------------------------------------------------

export type JenisRentang = 'hari-ini' | '7' | '30' | 'semua' | 'kustom'

export type Rentang = { jenis: JenisRentang; dari: string; sampai: string }

export const PILIHAN_RENTANG: { jenis: Exclude<JenisRentang, 'kustom'>; label: string }[] = [
  { jenis: 'hari-ini', label: 'Hari ini' },
  { jenis: '7', label: '7 hari' },
  { jenis: '30', label: '30 hari' },
  { jenis: 'semua', label: 'Semua' },
]

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/

function tanggalSah(nilai: unknown): string | null {
  return typeof nilai === 'string' && POLA_TANGGAL.test(nilai) && !Number.isNaN(Date.parse(`${nilai}T00:00:00Z`)) ? nilai : null
}

/** Rentang bawaan per pilihan: hari ini, 7 dan 30 hari terakhir termasuk hari ini, atau sejak data pertama. */
export function rentangPilihan(jenis: Exclude<JenisRentang, 'kustom'>, hariIni: string, dataPertama: string | null): Rentang {
  if (jenis === 'hari-ini') return { jenis, dari: hariIni, sampai: hariIni }
  if (jenis === 'semua') return { jenis, dari: dataPertama && dataPertama < hariIni ? dataPertama : hariIni, sampai: hariIni }
  return { jenis, dari: geserTanggal(hariIni, -(Number(jenis) - 1)), sampai: hariIni }
}

/**
 * Rentang dari parameter halaman: `?kunjungan=hari-ini|7|30|semua`, atau kalender `?dari=YYYY-MM-DD&sampai=YYYY-MM-DD`
 * (ditukar bila terbalik, tidak melewati hari ini, paling panjang `MAKS_RENTANG_HARI`). Bawaan 7 hari.
 */
export function bacaRentang(param: Record<string, unknown> | undefined, sekarang: Date, dataPertama: string | null = null): Rentang {
  const hariIni = tanggalWib(sekarang)
  let dari = tanggalSah(param?.dari)
  let sampai = tanggalSah(param?.sampai)
  if (dari || sampai) {
    dari ??= sampai!
    sampai ??= dari
    if (dari > sampai) [dari, sampai] = [sampai, dari]
    if (sampai > hariIni) sampai = hariIni
    if (dari > sampai) dari = sampai
    if (panjangRentang(dari, sampai) > MAKS_RENTANG_HARI) dari = geserTanggal(sampai, -(MAKS_RENTANG_HARI - 1))
    return { jenis: 'kustom', dari, sampai }
  }
  const pilihan = PILIHAN_RENTANG.find((p) => p.jenis === param?.kunjungan)?.jenis ?? '7'
  return rentangPilihan(pilihan, hariIni, dataPertama)
}

/** Rentang sebelumnya dengan panjang sama, untuk perbandingan; `null` untuk "Semua". */
export function rentangSebelumnya(r: Rentang): Rentang | null {
  if (r.jenis === 'semua') return null
  const n = panjangRentang(r.dari, r.sampai)
  return { jenis: 'kustom', dari: geserTanggal(r.dari, -n), sampai: geserTanggal(r.sampai, -n) }
}

// Skrip pencatat ---------------------------------------------------------------------------------------------------

/**
 * Parameter URL beranda admin untuk satu rentang: `dari` dan `sampai` untuk rentang kalender, `kunjungan` untuk
 * pilihan selain bawaan (7 hari). Dipakai tautan pilihan rentang, tautan periode Google (supaya rentang tidak
 * hilang), dan tautan Unduh CSV.
 */
export function paramRentang(r: Rentang): Record<string, string> {
  if (r.jenis === 'kustom') return { dari: r.dari, sampai: r.sampai }
  return r.jenis === '7' ? {} : { kunjungan: r.jenis }
}

/** Path CSV kunjungan rentang tertentu; selalu dengan tanggal tetap supaya isi berkas sama dengan yang dilihat. */
export const PATH_CSV = '/api/kunjungan/csv'
export const urlCsvKunjungan = (r: Rentang) => `${PATH_CSV}?${new URLSearchParams({ dari: r.dari, sampai: r.sampai })}`

export const PATH_CATAT = '/api/kunjungan/catat'
/** Atribut penanda halaman 404 (tidak dicatat sebagai kunjungan; halaman 404 punya log sendiri). */
export const PENANDA_404 = 'data-halaman-404'

/**
 * Skrip sebaris pencatat kunjungan (tanpa berkas JavaScript, anggaran §12): satu beacon per halaman yang dibuka,
 * termasuk pindah halaman lewat navigasi klien Next (`pushState`, `replaceState`, `popstate`). Tidak mengirim bila
 * peramban dikendalikan otomatis (`navigator.webdriver`, termasuk tes E2E), Global Privacy Control, atau Do Not
 * Track menyala, dan tidak mengirim dari halaman 404. Tanpa cookie dan tanpa penyimpanan di peramban.
 */
export function skripKunjungan(): string {
  return `(function(){try{var n=navigator,w=window;if(n.webdriver||n.globalPrivacyControl||n.doNotTrack==='1'||w.doNotTrack==='1')return;var u=${JSON.stringify(PATH_CATAT)},akhir=null,asal=document.referrer;function kirim(){var p=location.pathname;if(p===akhir)return;if(document.querySelector('[${PENANDA_404}]')){akhir=p;return}var d=JSON.stringify({p:p,r:akhir===null?asal:location.origin+akhir,s:new URLSearchParams(location.search).get('utm_source')||''});akhir=p;if(n.sendBeacon)n.sendBeacon(u,new Blob([d],{type:'text/plain'}));else fetch(u,{method:'POST',body:d,keepalive:true,credentials:'same-origin'})}var h=history;['pushState','replaceState'].forEach(function(f){var o=h[f];h[f]=function(){var r=o.apply(this,arguments);setTimeout(kirim,50);return r}});w.addEventListener('popstate',function(){setTimeout(kirim,50)});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kirim);else kirim()}catch(e){}})()`
}

// CSV --------------------------------------------------------------------------------------------------------------

export type BarisCsvKunjungan = {
  tanggal: string
  path: string
  negara: string | null
  kota: string | null
  kanal: string
  sumber: string
  perujuk: string | null
  perangkat: string
  peramban: string
  tayangan: number
  kunjungan: number
}

/** Satu sel CSV, dinetralkan dari rumus spreadsheet (sama dengan CSV pelanggan newsletter). */
function sel(nilai: string): string {
  let s = nilai
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Isi CSV statistik kunjungan per hari dan dimensi (UTF-8, baris CRLF). */
export function isiCsvKunjungan(baris: BarisCsvKunjungan[]): string {
  const kepala = ['tanggal', 'halaman', 'negara', 'kota', 'kanal', 'sumber', 'perujuk', 'perangkat', 'peramban', 'tayangan', 'kunjungan']
  const isi = baris.map((b) => [
    b.tanggal,
    b.path,
    namaNegara(b.negara),
    b.kota ?? '',
    LABEL_KANAL[b.kanal as Kanal] ?? b.kanal,
    b.sumber,
    b.perujuk ?? '',
    LABEL_PERANGKAT[b.perangkat as Perangkat] ?? b.perangkat,
    b.peramban,
    String(b.tayangan),
    String(b.kunjungan),
  ])
  return [kepala, ...isi].map((kolom) => kolom.map(sel).join(',')).join('\r\n') + '\r\n'
}
