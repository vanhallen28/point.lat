/**
 * Unggahan dari browser langsung ke Cloudinary (signed upload). Dipakai komponen admin
 * `UnggahLangsung`, tanpa dependensi server supaya aman masuk bundle klien.
 *
 * Cloudinary mewajibkan unggah bertahap untuk file di atas 100 MB: setiap potongan membawa
 * header `X-Unique-Upload-Id` yang sama dan `Content-Range` (https://cloudinary.com/documentation/upload_images).
 */

export const AMBANG_CHUNK = 100 * 1024 * 1024
export const UKURAN_CHUNK = 20 * 1024 * 1024

export type PersiapanKirim = { urlUnggah: string; field: Record<string, string> }

export type HasilCloudinary = { public_id: string; [kunci: string]: unknown }

export function pesanDariRespons(data: unknown): string | undefined {
  const d = data as { errors?: { message?: string }[]; error?: { message?: string } } | null
  const daftar = d?.errors?.map((e) => e.message).filter(Boolean)
  if (daftar?.length) return daftar.join(' ')
  return d?.error?.message
}

async function kirim(
  fetchFn: typeof fetch,
  url: string,
  field: Record<string, string>,
  potongan: Blob,
  headers: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const body = new FormData()
  for (const [kunci, nilai] of Object.entries(field)) body.append(kunci, nilai)
  body.append('file', potongan)

  let respons: Response
  try {
    respons = await fetchFn(url, { method: 'POST', body, headers })
  } catch {
    throw new Error('Koneksi ke Cloudinary terputus. Periksa internet lalu simpan ulang.')
  }
  const data = (await respons.json().catch(() => null)) as Record<string, unknown> | null
  if (!respons.ok) {
    const alasan = pesanDariRespons(data) ?? `status ${respons.status}`
    throw new Error(`Cloudinary menolak file (${alasan}). Coba unggah ulang.`)
  }
  return data ?? {}
}

export async function kirimKeCloudinary(
  berkas: Blob,
  persiapan: PersiapanKirim,
  opsi: { fetch?: typeof fetch; ambangChunk?: number; ukuranChunk?: number } = {},
): Promise<HasilCloudinary> {
  const fetchFn = opsi.fetch ?? fetch
  const ambang = opsi.ambangChunk ?? AMBANG_CHUNK
  const ukuran = opsi.ukuranChunk ?? UKURAN_CHUNK

  let hasil: Record<string, unknown>
  if (berkas.size <= ambang) {
    hasil = await kirim(fetchFn, persiapan.urlUnggah, persiapan.field, berkas)
  } else {
    const idUnggah = crypto.randomUUID()
    hasil = {}
    for (let awal = 0; awal < berkas.size; awal += ukuran) {
      const akhir = Math.min(awal + ukuran, berkas.size)
      hasil = await kirim(fetchFn, persiapan.urlUnggah, persiapan.field, berkas.slice(awal, akhir), {
        'X-Unique-Upload-Id': idUnggah,
        'Content-Range': `bytes ${awal}-${akhir - 1}/${berkas.size}`,
      })
    }
  }

  if (hasil.public_id !== persiapan.field.public_id) {
    throw new Error('Cloudinary mengembalikan file yang berbeda. Coba unggah ulang.')
  }
  return hasil as HasilCloudinary
}
