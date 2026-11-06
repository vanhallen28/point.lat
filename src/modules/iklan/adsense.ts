import type { SlotSiap } from './tipe'

/**
 * Kode iklan AdSense (Bantuan AdSense "Kode unit iklan display"): satu skrip `adsbygoogle.js?client=` per
 * halaman, lalu satu elemen `<ins class="adsbygoogle">` per unit yang diisi lewat `adsbygoogle.push({})`.
 * Ukuran tetap ditulis di atribut `style` elemen itu sendiri (bukan stylesheet luar), cara yang disebut
 * dokumentasi AdSense untuk unit berukuran pasti. Fungsi murni, dipakai `PemuatIklan` di browser.
 */

export const ASAL_ADSENSE = 'https://pagead2.googlesyndication.com'

/** URL skrip AdSense untuk ID penerbit ini. */
export function urlSkrip(klien: string): string {
  return `${ASAL_ADSENSE}/pagead/js/adsbygoogle.js?client=${encodeURIComponent(klien)}`
}

/** Atribut elemen `<ins>` satu unit berukuran tetap; `data-adtest="on"` hanya di mode uji. */
export function atributUnit(slot: Pick<SlotSiap, 'lebar' | 'tinggi' | 'klien' | 'unit' | 'uji'>): Record<string, string> {
  return {
    class: 'adsbygoogle',
    style: `display:inline-block;width:${slot.lebar}px;height:${slot.tinggi}px`,
    'data-ad-client': slot.klien,
    'data-ad-slot': slot.unit,
    ...(slot.uji ? { 'data-adtest': 'on' } : {}),
  }
}
