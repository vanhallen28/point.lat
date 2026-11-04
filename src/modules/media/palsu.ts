import { createHash } from 'crypto'
import { readFile } from 'fs/promises'

import type { AsetCloudinary, BerkasUnggahan, KlienCloudinary, OpsiUnggahan } from './klien'

export type AsetPalsu = AsetCloudinary & {
  /** `server`: lewat Upload API dari server. `browser`: signed upload langsung dari browser. */
  lewat: 'server' | 'browser'
  opsi: OpsiUnggahan
  isi: Buffer
  mimeType: string
}

export type KlienPalsu = KlienCloudinary & {
  /** Aset yang "tersimpan", dikunci publicId. Tes memeriksa isi ini. */
  readonly aset: Map<string, AsetPalsu>
  /**
   * Meniru Cloudinary menerima signed upload dari browser: API key dan tanda tangan diperiksa,
   * lalu aset disimpan dengan incoming transformation dari field yang ditandatangani.
   */
  unggahDariBrowser(field: Record<string, string>, berkas: BerkasUnggahan): Promise<AsetCloudinary>
  /** Unggahan berikutnya gagal dengan pesan ini (meniru Cloudinary menolak file). */
  gagalSekali(pesan: string): void
}

/** Ukuran video contoh bila tidak diketahui: vertikal 9:16, 30 detik. */
const VIDEO_CONTOH = { width: 1080, height: 1920, duration: 30 }

const RAHASIA = 'rahasia-palsu'

/** Skala dari `c_limit,w_<n>[,h_<n>]` di incoming transformation (tidak pernah memperbesar). */
function skalaBatas(transformasi: string, width: number, height: number): number {
  const w = /c_limit,w_(\d+)/.exec(transformasi)
  const h = /c_limit,w_\d+,h_(\d+)/.exec(transformasi)
  return Math.min(1, w ? Number(w[1]) / width : 1, h ? Number(h[1]) / height : 1)
}

/**
 * Klien Cloudinary dalam memori untuk tes dan pengembangan tanpa kredensial. Tidak memanggil
 * jaringan. Meniru batas ukuran incoming transformation supaya tes bisa memeriksa ukuran tersimpan.
 */
export function klienPalsu(cloudName = 'palsu'): KlienPalsu {
  const aset = new Map<string, AsetPalsu>()
  let versi = 1_700_000_000
  let galat: string | undefined

  const tanpaInternal = ({ lewat: _l, opsi: _o, isi: _i, mimeType: _m, ...data }: AsetPalsu): AsetCloudinary =>
    data

  function tandaTangan(parameter: Record<string, string>) {
    const teks = Object.keys(parameter)
      .sort()
      .map((k) => `${k}=${parameter[k]}`)
      .join('&')
    return createHash('sha1').update(`${teks}${RAHASIA}`).digest('hex')
  }

  async function simpan(berkas: BerkasUnggahan, opsi: OpsiUnggahan, lewat: AsetPalsu['lewat']) {
    if (galat) {
      const pesan = galat
      galat = undefined
      throw new Error(pesan)
    }
    const isi = berkas.tempFilePath ? await readFile(berkas.tempFilePath) : berkas.buffer
    const video = opsi.resource_type === 'video'
    let width = berkas.width ?? (video ? VIDEO_CONTOH.width : undefined)
    let height = berkas.height ?? (video ? VIDEO_CONTOH.height : undefined)
    if (width && height) {
      const skala = skalaBatas(opsi.transformation, width, height)
      width = Math.round(width * skala)
      height = Math.round(height * skala)
    }
    const data: AsetPalsu = {
      publicId: opsi.public_id,
      resourceType: opsi.resource_type,
      version: ++versi,
      format: berkas.mimeType.split('/')[1] ?? 'bin',
      bytes: isi.length,
      width,
      height,
      ...(video ? { duration: VIDEO_CONTOH.duration } : {}),
      lewat,
      opsi,
      isi,
      mimeType: berkas.mimeType,
    }
    aset.set(opsi.public_id, data)
    return tanpaInternal(data)
  }

  return {
    cloudName,
    apiKey: 'kunci-palsu',
    aset,
    tandaTangan,

    unggah: (berkas, opsi) => simpan(berkas, opsi, 'server'),

    async unggahDariBrowser(field, berkas) {
      const { api_key: kunci, signature, ...parameter } = field
      if (kunci !== 'kunci-palsu' || signature !== tandaTangan(parameter)) {
        throw new Error('Invalid Signature')
      }
      const opsi: OpsiUnggahan = {
        public_id: parameter.public_id,
        resource_type: berkas.mimeType.startsWith('video/') ? 'video' : 'image',
        overwrite: false,
        transformation: parameter.transformation,
        allowed_formats: parameter.allowed_formats,
        ...(parameter.eager ? { eager: parameter.eager, eager_async: true as const } : {}),
      }
      return simpan(berkas, opsi, 'browser')
    },

    async ambil(publicId, resourceType) {
      const ada = aset.get(publicId)
      return ada && ada.resourceType === resourceType ? tanpaInternal(ada) : null
    },

    async hapus(publicId) {
      aset.delete(publicId)
    },

    async unduh(data) {
      const ada = aset.get(data.publicId)
      if (!ada) return new Response(null, { status: 404 })
      return new Response(new Uint8Array(ada.isi), { headers: { 'Content-Type': ada.mimeType } })
    },

    gagalSekali(pesan) {
      galat = pesan
    },
  }
}
