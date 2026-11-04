import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { blokBeranda } from '@/blocks/beranda'
import { revalidasiBeranda } from '@/hooks/revalidasiPublik'

export const Beranda: GlobalConfig = {
  slug: 'beranda',
  label: 'Beranda',
  admin: { group: 'Tampilan' },
  access: { read: anyone, update: isAdmin },
  versions: { drafts: true, max: 20 },
  hooks: { afterChange: [revalidasiBeranda] },
  fields: [{ name: 'tataLetak', type: 'blocks', label: 'Tata letak', blocks: blokBeranda }],
}
