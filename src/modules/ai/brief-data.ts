import type { Payload } from 'payload'

import { urlAdmin } from '@/lib/admin'
import { artikelLain } from '@/modules/seo/endpoint'
import { cariKanibalisasi, sarankanLink } from '@/modules/seo/kemiripan'

import type { KonteksBrief, MasukanBrief } from './prompt/brief'

/**
 * Data brief dari database point. (bukan dari model): artikel yang sudah memakai keyword yang sama atau
 * sangat mirip, saran link internal, dan sumber resmi pilar artikel. Aturan kanibalisasi dan saran link
 * sama dengan panel SEO (Rencana 3, `seo/kemiripan.ts`); sumber resmi dari global Asisten AI.
 */
export async function lengkapiBrief(payload: Payload, m: MasukanBrief): Promise<MasukanBrief> {
  const [lain, pilar, global] = await Promise.all([
    artikelLain(payload, m.artikel),
    m.pilar ? payload.findByID({ collection: 'pilar', id: m.pilar, depth: 0, disableErrors: true }) : Promise.resolve(null),
    payload.findGlobal({ slug: 'asisten-ai', depth: 0 }),
  ])
  const pilarId = pilar?.id ?? null
  const konteks: KonteksBrief = {
    pilar: pilar?.nama ?? null,
    kanibalisasi: cariKanibalisasi(m.keyword, lain).map((a) => ({
      id: a.id,
      judul: a.judul,
      keyphrase: a.keyphrase ?? '',
      tingkat: a.tingkat,
      urlAdmin: urlAdmin.dokumen('artikel', a.id),
    })),
    linkInternal: sarankanLink({ pilarId, keyphrase: m.keyword }, lain).map((s) => ({
      id: s.id,
      judul: s.judul,
      path: s.path,
      alasan: s.alasan,
      urlAdmin: urlAdmin.dokumen('artikel', s.id),
    })),
    sumberResmi: (global.sumberResmi ?? [])
      .filter((s) => pilarId !== null && (typeof s.pilar === 'object' ? s.pilar?.id : s.pilar) === pilarId)
      .map((s) => ({ nama: s.nama, url: s.url })),
  }
  return { ...m, konteks }
}
