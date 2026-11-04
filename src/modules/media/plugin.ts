import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Plugin } from 'payload'

import { adapterCloudinary } from './adapter'
import type { KlienCloudinary } from './klien'

/**
 * Memasang adapter Cloudinary ke koleksi `media`.
 * - `disableLocalStorage: true`: tidak ada file di disk server.
 * - `disablePayloadAccessControl: true`: field `url` berisi URL CDN Cloudinary langsung
 *   (lewat `generateURL`), bukan `/api/media/file/...`. Media situs ini publik.
 */
export function mediaCloudinary({ klien }: { klien: () => KlienCloudinary }): Plugin {
  return cloudStoragePlugin({
    collections: {
      media: {
        adapter: adapterCloudinary({ klien }),
        disableLocalStorage: true,
        disablePayloadAccessControl: true,
      },
    },
  })
}
