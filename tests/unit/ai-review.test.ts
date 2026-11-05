import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { pakaiDrafAiField, reviewAiField } from '@/fields/reviewAi'
import { BUTIR_REVIEW, PESAN_REVIEW, reviewLengkap, tetapPakaiDrafAi, validasiButirReview } from '@/modules/ai/review'

const LENGKAP = { sumberDicek: true, angkaDicek: true, pengalamanDitambah: true }

describe('checklist review draf AI', () => {
  it('tiga butir: sumber dicek, angka dicek, dan insight atau pengalaman penulis (spesifikasi §10)', () => {
    expect(BUTIR_REVIEW.map((b) => b.label)).toEqual(['Sumber sudah dicek', 'Angka sudah dicek', 'Insight atau pengalaman penulis sudah ditambahkan'])
  })

  it('lengkap bila artikel tidak memakai draf AI, atau ketiga butir dicentang', () => {
    expect(reviewLengkap(false, null)).toBe(true)
    expect(reviewLengkap(true, LENGKAP)).toBe(true)
    expect(reviewLengkap(true, { ...LENGKAP, angkaDicek: false })).toBe(false)
    expect(reviewLengkap(true, undefined)).toBe(false)
  })

  it('validasi butir: wajib dicentang hanya untuk artikel yang memakai draf AI', () => {
    expect(validasiButirReview(false, { data: { pakaiDrafAi: true } })).toBe(PESAN_REVIEW)
    expect(validasiButirReview(true, { data: { pakaiDrafAi: true } })).toBe(true)
    expect(validasiButirReview(false, { data: { pakaiDrafAi: false } })).toBe(true)
    expect(validasiButirReview(null, { data: null })).toBe(true)
  })

  it('tanda draf AI hanya-baca di sidebar; checklist tampil hanya bila tanda menyala', () => {
    expect(pakaiDrafAiField).toMatchObject({ name: 'pakaiDrafAi', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', readOnly: true } })
    const kondisi = (reviewAiField as Extract<Field, { type: 'group' }>).admin?.condition as (data: Record<string, unknown>) => boolean
    expect([kondisi({ pakaiDrafAi: true }), kondisi({ pakaiDrafAi: false }), kondisi({})]).toEqual([true, false, false])
  })

  it('tanda draf AI yang sudah tersimpan tetap menyala walau dikirim false lewat API (hook beforeValidate)', () => {
    expect(pakaiDrafAiField).toMatchObject({ hooks: { beforeValidate: [tetapPakaiDrafAi] } })
    expect(tetapPakaiDrafAi({ value: false, originalDoc: { pakaiDrafAi: true } })).toBe(true)
    expect(tetapPakaiDrafAi({ value: undefined, originalDoc: { pakaiDrafAi: true } })).toBe(true)
    expect(tetapPakaiDrafAi({ value: true, originalDoc: { pakaiDrafAi: false } })).toBe(true)
    expect(tetapPakaiDrafAi({ value: false, originalDoc: { pakaiDrafAi: false } })).toBe(false)
    expect(tetapPakaiDrafAi({ value: true, originalDoc: undefined })).toBe(true)
  })
})
