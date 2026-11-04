import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { initClientUploads } from '@payloadcms/plugin-cloud-storage/utilities'
import type { CollectionConfig, Config, Plugin } from 'payload'

import { adapterCloudinary } from './adapter'
import type { KlienCloudinary } from './klien'
import { endpointTandaTangan, PATH_TANDA_TANGAN } from './tandaTangan'
import { isiMetaUnggahLangsung, periksaUnggahLangsung } from './unggahLangsung'

/** Komponen admin yang mendaftarkan pengunggah langsung untuk koleksi `media`. */
export const KOMPONEN_UNGGAH_LANGSUNG = '@/modules/media/UnggahLangsung#UnggahLangsung'

type Opsi = { klien: () => KlienCloudinary }

function pasangHook(koleksi: CollectionConfig): CollectionConfig {
  if (koleksi.slug !== 'media') return koleksi
  const hooks = koleksi.hooks ?? {}
  return {
    ...koleksi,
    hooks: {
      ...hooks,
      beforeOperation: [periksaUnggahLangsung, ...(hooks.beforeOperation ?? [])],
      beforeChange: [isiMetaUnggahLangsung, ...(hooks.beforeChange ?? [])],
    },
  }
}

/**
 * Memasang Cloudinary ke koleksi `media`:
 * - `disableLocalStorage: true`: tidak ada file di disk server.
 * - `disablePayloadAccessControl: true`: field `url` berisi URL CDN Cloudinary langsung
 *   (lewat `generateURL`). Media situs ini publik.
 * - unggah langsung dari browser: endpoint tanda tangan dan komponen klien didaftarkan lewat
 *   `initClientUploads`, pola yang sama dengan `@payloadcms/storage-s3` dan `storage-vercel-blob`.
 */
export function mediaCloudinary(opsi: Opsi): Plugin {
  return (incoming: Config): Config => {
    const config: Config = { ...incoming, collections: incoming.collections?.map(pasangHook) }
    initClientUploads({
      clientHandler: KOMPONEN_UNGGAH_LANGSUNG,
      collections: { media: true },
      config,
      enabled: true,
      serverHandler: endpointTandaTangan(opsi),
      serverHandlerPath: PATH_TANDA_TANGAN,
    })
    return cloudStoragePlugin({
      collections: {
        media: {
          adapter: adapterCloudinary(opsi),
          disableLocalStorage: true,
          disablePayloadAccessControl: true,
        },
      },
    })(config)
  }
}
