import { describe, expect, it } from 'vitest'

import { paragrafLexical } from '@/lib/lexical'

describe('paragrafLexical', () => {
  it('membuat satu paragraf Lexical per teks', () => {
    const isi = paragrafLexical(['Paragraf pertama.', 'Paragraf kedua.'])
    expect(isi.root.type).toBe('root')
    expect(isi.root.children).toHaveLength(2)
    expect(isi.root.children[1]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'text', text: 'Paragraf kedua.' }],
    })
  })
})
