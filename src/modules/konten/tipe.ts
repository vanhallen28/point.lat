import type { WarnaPilar } from '@/lib/konstanta'

/**
 * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
 * mentah: modul ini yang menerjemahkan relasi, path (`pathFor`), dan nilai bawaan.
 */

export type Tautan = { label: string; href: string }

export type ItemMenu = Tautan & { warna: WarnaPilar | null }

export type DataHeader = { menu: ItemMenu[]; tools: Tautan }

export type DataFooter = { tautan: Tautan[]; sosial: Tautan[]; whatsapp: string | null; hakCipta: string }
