import type { Access, FieldAccess } from 'payload'

type PenggunaMasuk = { id: number | string; peran?: string | null }

const pengguna = (user: unknown): PenggunaMasuk | undefined =>
  user ? (user as PenggunaMasuk) : undefined

export const anyone: Access = () => true

/** Tidak lewat admin atau REST: koleksi ini hanya ditulis sistem lewat Local API (Mesin Indexing). */
export const nobody: Access = () => false

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const isAdmin: Access = ({ req }) => pengguna(req.user)?.peran === 'admin'

export const isAdminField: FieldAccess = ({ req }) => pengguna(req.user)?.peran === 'admin'

export const isAdminOrSelf: Access = ({ req }) => {
  const user = pengguna(req.user)
  if (!user) return false
  if (user.peran === 'admin') return true
  return { id: { equals: user.id } }
}

/** Pengunjung hanya melihat dokumen terbit; pengguna yang masuk melihat draf juga. */
export const publishedOrLoggedIn: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
