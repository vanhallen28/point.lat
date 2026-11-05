/**
 * URL halaman admin Payload (rute bawaan `/admin`), satu-satunya tempat path admin dirangkai. Dipakai
 * dashboard SEO dan sel daftar admin untuk menautkan dokumen yang perlu diperbaiki.
 */
export const PATH_ADMIN = '/admin'

export const urlAdmin = {
  daftar: (koleksi: string) => `${PATH_ADMIN}/collections/${koleksi}`,
  dokumen: (koleksi: string, id: number | string) => `${PATH_ADMIN}/collections/${koleksi}/${id}`,
  /** Form dokumen baru; `isian` menjadi kueri URL yang dibaca `defaultValue` field (misalnya `?dari=/path`). */
  buat: (koleksi: string, isian: Record<string, string> = {}) => {
    const kueri = new URLSearchParams(isian).toString()
    return `${PATH_ADMIN}/collections/${koleksi}/create${kueri ? `?${kueri}` : ''}`
  },
  global: (slug: string) => `${PATH_ADMIN}/globals/${slug}`,
} as const
