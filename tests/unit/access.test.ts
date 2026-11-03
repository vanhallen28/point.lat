import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { isAdmin, isAdminOrSelf, isLoggedIn, publishedOrLoggedIn } from '@/access'
import { peranAwal } from '@/hooks/tetapkanPeranAwal'

type Args = Parameters<Access>[0]
const args = (user?: Record<string, unknown>): Args => ({ req: { user } }) as unknown as Args

describe('akses', () => {
  it('isLoggedIn hanya untuk pengguna yang masuk', () => {
    expect(isLoggedIn(args())).toBe(false)
    expect(isLoggedIn(args({ id: 1, peran: 'editor' }))).toBe(true)
  })

  it('isAdmin hanya untuk peran admin', () => {
    expect(isAdmin(args({ id: 1, peran: 'editor' }))).toBe(false)
    expect(isAdmin(args({ id: 1, peran: 'admin' }))).toBe(true)
  })

  it('isAdminOrSelf membatasi editor ke dokumennya sendiri', () => {
    expect(isAdminOrSelf(args({ id: 1, peran: 'admin' }))).toBe(true)
    expect(isAdminOrSelf(args({ id: 7, peran: 'editor' }))).toEqual({ id: { equals: 7 } })
    expect(isAdminOrSelf(args())).toBe(false)
  })

  it('publishedOrLoggedIn menyaring draf untuk pengunjung', () => {
    expect(publishedOrLoggedIn(args())).toEqual({ _status: { equals: 'published' } })
    expect(publishedOrLoggedIn(args({ id: 1, peran: 'editor' }))).toBe(true)
  })
})

describe('peranAwal', () => {
  it('pengguna pertama selalu admin', () => {
    expect(peranAwal(0, 'editor')).toBe('admin')
    expect(peranAwal(0, undefined)).toBe('admin')
  })

  it('pengguna berikutnya memakai peran yang diminta, default editor', () => {
    expect(peranAwal(3, 'admin')).toBe('admin')
    expect(peranAwal(3, 'editor')).toBe('editor')
    expect(peranAwal(3, undefined)).toBe('editor')
  })
})
