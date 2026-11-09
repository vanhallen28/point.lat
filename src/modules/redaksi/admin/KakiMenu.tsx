import type { ServerProps } from 'payload'

import { teksTanggal, teksWaktu } from '@/modules/pantau/format'

/**
 * Bagian bawah menu admin (`admin.components.afterNavLinks`, spesifikasi §23): kartu Sinkron Google (hanya admin,
 * dari tugas harian `analitik` dan total harian terakhir) dan nama pengguna yang sedang masuk.
 */
export async function KakiMenu({ user, payload }: ServerProps) {
  const pengguna = user as { nama?: string | null; email?: string; peran?: string | null } | undefined
  if (!pengguna) return null
  const admin = pengguna.peran === 'admin'
  let sinkron: { status: string | null; selesai: string | null; sampai: string | null } | null = null
  if (admin) {
    const [tugas, hari] = await Promise.all([
      payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'analitik' } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: 'analitik-situs', sort: '-tanggal', depth: 0, limit: 1, overrideAccess: true, select: { tanggal: true } }),
    ])
    const t = tugas.docs[0]
    sinkron = { status: t?.status ?? null, selesai: t?.selesai ?? null, sampai: hari.docs[0]?.tanggal ?? null }
  }
  const nama = pengguna.nama?.trim() || pengguna.email || 'Pengguna'
  const status = sinkron?.status === 'gagal' ? 'gagal' : sinkron?.selesai ? 'baik' : 'belum'
  return (
    <div className="redaksi-kaki">
      {sinkron && (
        <div className="redaksi-kaki__sinkron" data-status={status}>
          <p className="redaksi-kaki__judul">
            <span className="redaksi-kaki__titik" aria-hidden="true" />
            Sinkron Google{status === 'gagal' ? ': gagal' : status === 'belum' ? ': belum jalan' : ''}
          </p>
          {sinkron.selesai && <p>{teksWaktu(sinkron.selesai)}</p>}
          <p className="redaksi-kaki__redup">{sinkron.sampai ? `Data sampai ${teksTanggal(sinkron.sampai)}` : 'Belum ada data Search Console'}</p>
        </div>
      )}
      <div className="redaksi-kaki__pengguna">
        <span className="redaksi-kaki__avatar" aria-hidden="true">
          {nama.slice(0, 1).toUpperCase()}
        </span>
        <span>
          <span className="redaksi-kaki__nama">{nama}</span>
          <span className="redaksi-kaki__peran">{admin ? 'Admin' : 'Editor'}</span>
        </span>
      </div>
    </div>
  )
}
