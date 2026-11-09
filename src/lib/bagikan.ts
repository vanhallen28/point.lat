/**
 * Tautan bagikan artikel (spesifikasi §23): tautan biasa ke halaman bagikan tiap layanan, tanpa skrip atau tombol
 * pihak ketiga, jadi tidak ada cookie atau pelacak di halaman point.
 */
export type TautanBagikan = { layanan: 'whatsapp' | 'telegram' | 'x' | 'facebook'; nama: string; href: string }

export function tautanBagikan(url: string, judul: string): TautanBagikan[] {
  const u = encodeURIComponent(url)
  const j = encodeURIComponent(judul)
  return [
    { layanan: 'whatsapp', nama: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${judul} ${url}`)}` },
    { layanan: 'telegram', nama: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${j}` },
    { layanan: 'x', nama: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${j}` },
    { layanan: 'facebook', nama: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ]
}
