import { Ikon, type NamaIkon } from '@/components/dasar/Ikon'
import { paragrafTeks } from '@/modules/konten/isi'
import type { BlokCallout } from '@/payload-types'

import gaya from './Isi.module.css'

const GAYA: Record<BlokCallout['gaya'], { label: string; ikon: NamaIkon }> = {
  info: { label: 'Info', ikon: 'info' },
  tips: { label: 'Tips', ikon: 'lightbulb' },
  peringatan: { label: 'Perhatian', ikon: 'triangle-alert' },
}

/** Kotak catatan di isi. Jenisnya ditulis sebagai label, tidak hanya lewat ikon atau garis. */
export function Callout({ blok }: { blok: Pick<BlokCallout, 'gaya' | 'judul' | 'isi'> }) {
  const { label, ikon } = GAYA[blok.gaya] ?? GAYA.info
  return (
    <div role="note" className={gaya.callout} data-gaya={blok.gaya}>
      <Ikon nama={ikon} />
      <div>
        <p className={gaya.label}>{label}</p>
        {blok.judul && <p className={gaya.calloutJudul}>{blok.judul}</p>}
        {paragrafTeks(blok.isi).map((teks, i) => (
          <p key={i}>{teks}</p>
        ))}
      </div>
    </div>
  )
}
