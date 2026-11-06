import { muatAdsTxt } from '@/modules/iklan'
import { responsAdsTxt } from '@/modules/iklan/rute'

/** ads.txt (spesifikasi §7 dan §11): baris AdSense dari ID penerbit di global Iklan dan baris tambahan editor. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return responsAdsTxt(await muatAdsTxt())
}
