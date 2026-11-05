import type { Payload } from 'payload'

import { ambilPengaturanIndexing } from '../antrean'
import { ringkasPemasangan } from '../pemasangan'

import './indexing.scss'

/**
 * Field `ui` di Pengaturan SEO (server component): status pemasangan Mesin Indexing dari env server dan
 * pengaturan yang tersimpan. Rahasia hanya disebut terpasang atau belum.
 */
export async function StatusPemasangan({ payload }: { payload: Payload }) {
  const butir = ringkasPemasangan(process.env, await ambilPengaturanIndexing(payload))
  return (
    <section className="indexing-pemasangan" aria-label="Status pemasangan Mesin Indexing">
      <p className="indexing-pemasangan__judul">Status pemasangan</p>
      <dl>
        {butir.map((b) => (
          <div key={b.label}>
            <dt>{b.label}</dt>
            <dd>
              <span className={`indexing-pemasangan__tanda indexing-pemasangan__tanda--${b.siap ? 'siap' : 'belum'}`}>
                {b.siap ? 'Siap' : 'Perlu diatur'}
              </span>{' '}
              {b.teks}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
