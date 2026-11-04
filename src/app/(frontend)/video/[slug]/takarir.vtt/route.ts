import { muatTakarir } from '@/modules/konten'

/**
 * `/video/{slug}/takarir.vtt`: takarir WebVTT video terbit untuk `<track>` di pemutar. Isinya disimpan
 * di CMS (field `takarir`), jadi tidak ada unggahan berkas ke Cloudinary. Data di-cache bertag `video`.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const takarir = await muatTakarir((await params).slug)
  if (!takarir) return new Response('Takarir tidak ditemukan.', { status: 404 })
  return new Response(`${takarir}\n`, {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
