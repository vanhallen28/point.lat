import Link from 'next/link'
import type { AnchorHTMLAttributes } from 'react'

import { tautanInternal } from '@/modules/konten/tampilan'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/** Path situs lewat `next/link` (navigasi klien dan View Transitions); URL luar lewat `<a>`. */
export function Tautan({ href, children, ...atribut }: Props) {
  if (tautanInternal(href)) {
    return (
      <Link href={href} {...atribut}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} rel="noopener" {...atribut}>
      {children}
    </a>
  )
}
