import type { SerializedAutoLinkNode, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText, type JSXConverter, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { ReactNode } from 'react'

import { Tautan } from '@/components/dasar/Tautan'
import { mediaTampil } from '@/modules/konten/artikel'
import { hrefDokumen } from '@/modules/konten/isi'
import type { IsiDokumen } from '@/modules/seo/lexical'
import type { BlokCallout, BlokEmbedTool, BlokEmbedVideo, BlokTabelPerbandingan, Media } from '@/payload-types'

import { Callout } from './Callout'
import { GambarIsi } from './GambarIsi'
import gaya from './Isi.module.css'
import { KartuTool } from './KartuTool'
import { TabelPerbandingan } from './TabelPerbandingan'
import { VideoSemat } from './VideoSemat'

const HEADING = new Set(['h2', 'h3', 'h4', 'h5', 'h6'])

/** Tautan internal ke dokumen terbit memakai path `pathFor`; tautan ke dokumen yang belum terbit menjadi teks. */
const tautan: JSXConverter<SerializedLinkNode | SerializedAutoLinkNode> = ({ node, nodesToJSX }) => {
  const anak = nodesToJSX({ nodes: node.children })
  const { fields } = node
  const href = fields.linkType === 'internal' ? hrefDokumen(fields.doc?.relationTo, fields.doc?.value) : fields.url?.trim()
  if (!href) return <>{anak}</>
  if (fields.newTab) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {anak}
        <span className="sr"> (tab baru)</span>
      </a>
    )
  }
  return <Tautan href={href}>{anak}</Tautan>
}

function konverter(cloudName: string): JSXConvertersFunction {
  return ({ defaultConverters }) => ({
    ...defaultConverters,
    // Id jangkar dari `tandaiSubjudul` dipakai daftar isi. H1 di isi sudah diturunkan ke H2.
    heading: ({ node, nodesToJSX }) => {
      const { tag, idJangkar } = node as unknown as { tag: string; idJangkar?: string }
      const Tag = (HEADING.has(tag) ? tag : 'h2') as 'h2'
      return <Tag id={idJangkar}>{nodesToJSX({ nodes: node.children })}</Tag>
    },
    link: tautan,
    autolink: tautan,
    upload: ({ node }) => {
      const media = mediaTampil((node as unknown as { value: Media | number }).value)
      return media?.jenis === 'gambar' ? <GambarIsi media={media} cloudName={cloudName} /> : null
    },
    relationship: ({ node }) => {
      const { relationTo, value } = node as unknown as { relationTo: string; value: { judul?: string; nama?: string } | number }
      const href = hrefDokumen(relationTo, value)
      if (!href || typeof value !== 'object') return null
      return (
        <p className={gaya.bacaJuga}>
          Baca juga: <Tautan href={href}>{value.judul ?? value.nama}</Tautan>
        </p>
      )
    },
    blocks: {
      callout: ({ node }: { node: { fields: BlokCallout } }) => <Callout blok={node.fields} />,
      tabelPerbandingan: ({ node }: { node: { fields: BlokTabelPerbandingan } }) => <TabelPerbandingan blok={node.fields} />,
      embedTool: ({ node }: { node: { fields: BlokEmbedTool } }) => <KartuTool tool={node.fields.tool} />,
      embedVideo: ({ node }: { node: { fields: BlokEmbedVideo } }) => <VideoSemat video={node.fields.video} cloudName={cloudName} />,
    },
    // Node yang tidak dikenal tidak dirender (bawaan Payload menulis "unknown node").
    unknown: () => null,
  })
}

/** Isi artikel dari JSON Lexical (sudah ditandai `tandaiSubjudul`), dirender di server tanpa JavaScript klien. */
export function IsiArtikel({ isi, cloudName }: { isi: IsiDokumen; cloudName: string }): ReactNode {
  if (!isi?.root) return null
  return <RichText data={isi as unknown as SerializedEditorState} converters={konverter(cloudName)} className={gaya.prosa} />
}
