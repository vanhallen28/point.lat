import type { PayloadRequest, Where } from 'payload'

/** Koleksi yang path-nya `/{slug}` sehingga slugnya harus unik lintas koleksi. */
export const KOLEKSI_TINGKAT_ATAS = ['artikel', 'pilar', 'halaman'] as const
export type KoleksiTingkatAtas = (typeof KOLEKSI_TINGKAT_ATAS)[number]

export async function cariBentrokTingkatAtas(
  req: PayloadRequest,
  slug: string,
  sendiri: { koleksi: KoleksiTingkatAtas; id?: number | string },
): Promise<string | null> {
  for (const koleksi of KOLEKSI_TINGKAT_ATAS) {
    const syarat: Where[] = [{ slug: { equals: slug } }]
    if (koleksi === sendiri.koleksi && sendiri.id !== undefined) {
      syarat.push({ id: { not_equals: sendiri.id } })
    }
    if (koleksi === 'artikel') syarat.push({ tipe: { not_equals: 'glosarium' } })

    const { totalDocs } = await req.payload.count({ collection: koleksi, where: { and: syarat }, req })
    if (totalDocs > 0) return `Slug "${slug}" sudah dipakai ${koleksi} lain. Pilih slug lain.`
  }
  return null
}
