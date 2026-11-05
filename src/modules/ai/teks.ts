import { teksNode, tautanIsi, type IsiDokumen } from '@/modules/seo/lexical'
import { pecahKalimat } from '@/modules/seo/teks'

/**
 * Teks artikel per blok untuk asisten AI: deck, poin Intinya, isi (subjudul, paragraf, butir daftar,
 * kutipan), dan FAQ, sesuai urutan tampil. Dibaca dari isian form admin, jadi cek pola dan cek klaim
 * berjalan di browser tanpa menyimpan. Fungsi murni, tanpa impor server.
 */

/** Isian form artikel yang dibaca asisten (bentuk `reduceFieldsToValues`). */
export type IsianAsisten = {
  judul?: string | null
  deck?: string | null
  intinya?: { poin?: string | null }[] | null
  isi?: IsiDokumen
  faq?: { pertanyaan?: string | null; jawaban?: string | null }[] | null
  sumber?: { judul?: string | null; url?: string | null; penerbit?: string | null }[] | null
}

export type JenisBlok = 'deck' | 'intinya' | 'subjudul' | 'paragraf' | 'faq'

/** Satu blok teks. `label` menunjukkan letaknya ke editor; `tautan` berisi teks tautan di blok itu. */
export type Blok = { jenis: JenisBlok; label: string; teks: string; tautan: string[] }

type Node = { type?: string; children?: Node[]; tag?: string }

const daftar = <T>(nilai: unknown): T[] => (Array.isArray(nilai) ? (nilai as T[]) : [])

/** Teks tautan di satu node Lexical (tautan internal dan luar). */
function teksTautan(node: Node): string[] {
  return tautanIsi({ root: { children: [node] } }, '')
    .map((t) => t.teks)
    .filter(Boolean)
}

/** Blok isi Lexical: subjudul, paragraf, kutipan, dan setiap butir daftar (juga daftar bertingkat). */
function blokIsi(isi: IsiDokumen): Blok[] {
  const hasil: Blok[] = []
  let paragraf = 0
  const tambah = (node: Node) => {
    const teks = teksNode(node).trim()
    if (!teks) return
    if (node.type === 'heading') {
      hasil.push({ jenis: 'subjudul', label: `Subjudul "${teks}"`, teks, tautan: teksTautan(node) })
      return
    }
    paragraf++
    hasil.push({ jenis: 'paragraf', label: `Paragraf ${paragraf}`, teks, tautan: teksTautan(node) })
  }
  const jelajah = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === 'list') jelajah(daftar<Node>(node.children))
      else if (node.type === 'listitem') {
        // Butir yang berisi daftar bertingkat: teks butir itu sendiri, lalu butir di dalamnya.
        const anak = daftar<Node>(node.children)
        const sendiri = anak.filter((a) => a.type !== 'list')
        if (sendiri.length) tambah({ type: 'listitem', children: sendiri })
        jelajah(anak.filter((a) => a.type === 'list'))
      } else if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'quote') tambah(node)
    }
  }
  jelajah(daftar<Node>(isi?.root?.children))
  return hasil
}

/** Semua blok teks artikel, sesuai urutan tampil di halaman. Blok kosong dilewati. */
export function blokArtikel(isian: IsianAsisten): Blok[] {
  const hasil: Blok[] = []
  const deck = isian.deck?.trim()
  if (deck) hasil.push({ jenis: 'deck', label: 'Deck', teks: deck, tautan: [] })
  daftar<{ poin?: string | null }>(isian.intinya).forEach((p, i) => {
    const teks = p?.poin?.trim()
    if (teks) hasil.push({ jenis: 'intinya', label: `Intinya poin ${i + 1}`, teks, tautan: [] })
  })
  hasil.push(...blokIsi(isian.isi))
  daftar<{ pertanyaan?: string | null; jawaban?: string | null }>(isian.faq).forEach((f, i) => {
    const teks = f?.jawaban?.trim()
    if (teks) hasil.push({ jenis: 'faq', label: `FAQ ${i + 1}`, teks, tautan: [] })
  })
  return hasil
}

/** Kalimat satu blok. Subjudul dan poin pendek dihitung satu kalimat. */
export function kalimatBlok(blok: Blok): string[] {
  return blok.jenis === 'subjudul' ? [blok.teks] : pecahKalimat(blok.teks)
}

/** Teks polos artikel untuk prompt: judul, deck, Intinya, lalu isi dengan subjudul bertanda `##`. */
export function teksPolos(isian: IsianAsisten): string {
  return blokArtikel(isian)
    .filter((b) => b.jenis !== 'faq')
    .map((b) => (b.jenis === 'subjudul' ? `## ${b.teks}` : b.jenis === 'intinya' ? `- ${b.teks}` : b.teks))
    .join('\n\n')
}
