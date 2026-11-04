import type { CollectionConfig, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { klienDariEnv } from '@/modules/media'
import { adapterCloudinary, NAMA_ADAPTER, PESAN_UNGGAH_GAGAL } from '@/modules/media/adapter'
import { klienPalsu } from '@/modules/media/palsu'

const koleksi = { slug: 'media', fields: [] } as unknown as CollectionConfig

function reqPalsu() {
  const logger = { error: vi.fn(), warn: vi.fn() }
  return { req: { payload: { logger } } as unknown as PayloadRequest, logger }
}

function siapkan() {
  const klien = klienPalsu('demo')
  const adapter = adapterCloudinary({ klien: () => klien })({ collection: koleksi })
  return { klien, adapter }
}

const berkas = (mimeType: string, filename: string, isi = 'isi') => ({
  buffer: Buffer.from(isi),
  filename,
  filesize: isi.length,
  mimeType,
})

describe('adapterCloudinary', () => {
  it('bernama cloudinary dan tidak menyimpan ke disk lokal', () => {
    const { adapter } = siapkan()
    expect(adapter.name).toBe(NAMA_ADAPTER)
    expect(NAMA_ADAPTER).toBe('cloudinary')
  })

  it('handleUpload mengunggah lewat klien dan mengembalikan metadata Cloudinary', async () => {
    const { klien, adapter } = siapkan()
    const { req } = reqPalsu()
    const hasil = (await adapter.handleUpload({
      clientUploadContext: undefined,
      collection: koleksi,
      data: { filename: 'grafik.png', mimeType: 'image/png', width: 4000, height: 3000 },
      file: berkas('image/png', 'grafik.png'),
      req,
      storageFilePath: 'grafik.png',
    })) as Record<string, unknown>

    expect(hasil.publicId).toMatch(/^point\/gambar\/grafik-[0-9a-f]{8}$/)
    expect(hasil).toMatchObject({ jenis: 'gambar', width: 2560, height: 1920, filesize: 3, durasi: null })
    expect(hasil.url).toBe(`https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${hasil.publicId}`)
    expect(klien.aset.get(hasil.publicId as string)?.lewat).toBe('server')
  })

  it('handleUpload video mengisi durasi dan URL MP4', async () => {
    const { adapter } = siapkan()
    const { req } = reqPalsu()
    const hasil = (await adapter.handleUpload({
      clientUploadContext: undefined,
      collection: koleksi,
      data: { filename: 'thr.mp4', mimeType: 'video/mp4' },
      file: berkas('video/mp4', 'thr.mp4'),
      req,
      storageFilePath: 'thr.mp4',
    })) as Record<string, unknown>
    expect(hasil).toMatchObject({ jenis: 'video', width: 1080, height: 1920, durasi: 30 })
    expect(hasil.url).toBe(`https://res.cloudinary.com/demo/video/upload/q_auto/${hasil.publicId}.mp4`)
  })

  it('handleUpload mengubah galat Cloudinary menjadi pesan berbahasa Indonesia', async () => {
    const { klien, adapter } = siapkan()
    const { req, logger } = reqPalsu()
    klien.gagalSekali('Invalid image file')
    await expect(
      adapter.handleUpload({
        clientUploadContext: undefined,
        collection: koleksi,
        data: { filename: 'rusak.png', mimeType: 'image/png' },
        file: berkas('image/png', 'rusak.png'),
        req,
        storageFilePath: 'rusak.png',
      }),
    ).rejects.toThrow(PESAN_UNGGAH_GAGAL)
    expect(logger.error).toHaveBeenCalledOnce()
    expect(PESAN_UNGGAH_GAGAL).toBe('Unggahan ke Cloudinary gagal. Coba unggah ulang filenya.')
  })

  it('generateURL dan staticHandler memakai publicId dari dokumen', async () => {
    const { adapter } = siapkan()
    const { req } = reqPalsu()
    const data = { publicId: 'point/gambar/a-1', jenis: 'gambar', filename: 'a.png' }
    expect(await adapter.generateURL?.({ collection: koleksi, data, filename: 'a.png' })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/point/gambar/a-1',
    )
    const respons = await adapter.staticHandler(req, {
      doc: data as never,
      params: { collection: 'media', filename: 'a.png' },
    })
    expect(respons.status).toBe(302)
    expect(respons.headers.get('location')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/point/gambar/a-1',
    )
    const kosong = await adapter.staticHandler(req, { params: { collection: 'media', filename: 'x.png' } })
    expect(kosong.status).toBe(404)
  })

  it('handleDelete menghapus aset, dan galat hapus hanya dicatat', async () => {
    const { klien, adapter } = siapkan()
    const { req, logger } = reqPalsu()
    klien.aset.set('point/video/v-1', {
      publicId: 'point/video/v-1',
      resourceType: 'video',
      version: 1,
      format: 'mp4',
      bytes: 1,
      lewat: 'server',
      opsi: { public_id: 'point/video/v-1', resource_type: 'video', overwrite: false, transformation: '', allowed_formats: '' },
      isi: Buffer.alloc(1),
      mimeType: 'video/mp4',
    })
    await adapter.handleDelete({
      collection: koleksi,
      doc: { id: 1, publicId: 'point/video/v-1', mimeType: 'video/mp4' } as never,
      filename: 'v.mp4',
      req,
      storageFilePath: 'v.mp4',
    })
    expect(klien.aset.has('point/video/v-1')).toBe(false)

    klien.hapus = async () => {
      throw new Error('jaringan putus')
    }
    await adapter.handleDelete({
      collection: koleksi,
      doc: { id: 2, publicId: 'point/gambar/g-2', mimeType: 'image/png' } as never,
      filename: 'g.png',
      req,
      storageFilePath: 'g.png',
    })
    expect(logger.warn).toHaveBeenCalledOnce()
  })
})

describe('klienDariEnv', () => {
  it('memakai klien palsu bila kredensial tidak lengkap', () => {
    expect(klienDariEnv({}).cloudName).toBe('palsu')
    expect(klienDariEnv({ CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'y' }).cloudName).toBe('palsu')
  })

  it('memakai klien Cloudinary sungguhan bila ketiga kredensial ada (tanpa memanggil jaringan)', () => {
    const klien = klienDariEnv({
      CLOUDINARY_CLOUD_NAME: 'awan-tes',
      CLOUDINARY_API_KEY: '123',
      CLOUDINARY_API_SECRET: 'abcd',
    })
    expect(klien.cloudName).toBe('awan-tes')
    expect(klien.apiKey).toBe('123')
    // Contoh resmi https://cloudinary.com/documentation/authentication_signatures
    expect(
      klien.tandaTangan({
        eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        public_id: 'sample_image',
        timestamp: '1315060510',
      }),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
  })

  it('menolak jalan di produksi tanpa kredensial, kecuali saat next build', () => {
    expect(() => klienDariEnv({ NODE_ENV: 'production' })).toThrow(/wajib diisi di produksi/)
    expect(klienDariEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }).cloudName).toBe('palsu')
  })
})
