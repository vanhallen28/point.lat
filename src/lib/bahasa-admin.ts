import { id } from 'payload/i18n/id'
import type { Config } from 'payload'

/**
 * Bahasa admin Payload (keputusan pemilik, Rencana 8A): hanya bahasa Indonesia, jadi semua pengguna
 * melihat admin berbahasa Indonesia apa pun bahasa browsernya. Terjemahan bawaan dari `payload/i18n/id`
 * (paket `@payloadcms/translations` versi yang sama dengan Payload, tanpa dependensi baru).
 *
 * Tambahan di sini hanya untuk yang belum diterjemahkan atau melanggar aturan copy point.:
 * - Editor Lexical 3.92.1 belum punya terjemahan Indonesia sama sekali, sehingga tanpa tambahan ini
 *   toolbar menampilkan kunci mentah seperti `lexical:heading:label`.
 * - Satu teks bawaan memakai em dash (`general:sorryNotFound`).
 *
 * Teks bawaan lain yang menyapa "Anda" (bukan "kamu") dan memakai huruf kapital di setiap kata tidak
 * ditimpa: menimpa puluhan kunci berarti merawat salinan terjemahan sendiri setiap kali Payload naik versi.
 */
export const TERJEMAHAN_ADMIN = {
  general: {
    sorryNotFound: 'Maaf, tidak ada yang sesuai dengan permintaan Anda.',
  },
  lexical: {
    general: {
      placeholder: "Mulai mengetik, atau tekan '/' untuk perintah...",
      slashMenuBasicGroupLabel: 'Dasar',
      slashMenuListGroupLabel: 'Daftar',
      toolbarItemsActive: '{{count}} aktif',
    },
    align: {
      alignCenterLabel: 'Rata tengah',
      alignJustifyLabel: 'Rata kiri dan kanan',
      alignLeftLabel: 'Rata kiri',
      alignRightLabel: 'Rata kanan',
    },
    blockquote: { label: 'Kutipan' },
    blocks: {
      inlineBlocks: {
        create: 'Buat {{label}}',
        edit: 'Ubah {{label}}',
        label: 'Blok sebaris',
        remove: 'Hapus {{label}}',
      },
      label: 'Blok',
    },
    heading: { label: 'Judul {{headingLevel}}' },
    horizontalRule: { label: 'Garis pemisah' },
    indent: { decreaseLabel: 'Kurangi indentasi', increaseLabel: 'Tambah indentasi' },
    link: { label: 'Tautan', loadingWithEllipsis: 'Memuat...' },
    checklist: { label: 'Daftar centang' },
    orderedList: { label: 'Daftar bernomor' },
    unorderedList: { label: 'Daftar berbutir' },
    paragraph: { label: 'Paragraf', label2: 'Teks biasa' },
    relationship: { label: 'Relasi' },
    textState: { defaultStyle: 'Gaya bawaan' },
    upload: { label: 'Unggahan' },
  },
}

export const BAHASA_ADMIN: NonNullable<Config['i18n']> = {
  supportedLanguages: { id },
  fallbackLanguage: 'id',
  translations: { id: TERJEMAHAN_ADMIN },
}
