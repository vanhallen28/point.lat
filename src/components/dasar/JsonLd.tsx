import { serialisasiJsonLd, type JsonLd as DataJsonLd } from '@/modules/seo/jsonld'

/** JSON-LD dari `jsonLd()` modul SEO. Isi di-escape `serialisasiJsonLd` supaya tidak bisa menutup tag skrip. */
export function JsonLd({ data }: { data: DataJsonLd }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialisasiJsonLd(data) }} />
}
