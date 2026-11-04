import { describe, expect, it } from 'vitest'

import { klienPalsu } from '@/modules/media/palsu'
import {
  FOLDER,
  jenisDariPublicId,
  mimeDiizinkan,
  opsiUnggahan,
  parameterTandaTangan,
  publicIdBaru,
  siapkanUnggahan,
  TRANSFORMASI_MASUK,
  unggah,
} from '@/modules/media/unggah'
import { EAGER_VIDEO } from '@/modules/media/url'

describe('publicIdBaru', () => {
  it('memakai folder per jenis, nama file yang di-slug, dan akhiran acak', () => {
    expect(publicIdBaru('Slip Gaji Mei.PNG', 'image/png', () => 'a1b2c3d4')).toBe(
      'point/gambar/slip-gaji-mei-a1b2c3d4',
    )
    expect(publicIdBaru('THR 2026.mp4', 'video/mp4', () => 'e5f6a7b8')).toBe('point/video/thr-2026-e5f6a7b8')
    expect(publicIdBaru('😀.jpg', 'image/jpeg', () => '00000000')).toBe('point/gambar/media-00000000')
    expect(publicIdBaru('a.png', 'image/png')).toMatch(/^point\/gambar\/a-[0-9a-f]{8}$/)
  })

  it('folder sesuai keputusan: point/gambar dan point/video', () => {
    expect(FOLDER).toEqual({ gambar: 'point/gambar', video: 'point/video' })
    expect(jenisDariPublicId('point/video/thr-2026-e5f6a7b8')).toBe('video')
    expect(jenisDariPublicId('point/gambar/slip-gaji-mei-a1b2c3d4')).toBe('gambar')
  })
})

describe('mimeDiizinkan', () => {
  it('menerima gambar raster umum serta video MP4 dan WebM', () => {
    expect(mimeDiizinkan('image/png')).toBe(true)
    expect(mimeDiizinkan('image/avif')).toBe(true)
    expect(mimeDiizinkan('video/mp4')).toBe(true)
    expect(mimeDiizinkan('video/webm')).toBe(true)
    expect(mimeDiizinkan('image/svg+xml')).toBe(false)
    expect(mimeDiizinkan('image/heic')).toBe(false)
    expect(mimeDiizinkan('video/quicktime')).toBe(false)
    expect(mimeDiizinkan('application/pdf')).toBe(false)
    expect(mimeDiizinkan(undefined)).toBe(false)
  })
})

describe('opsiUnggahan', () => {
  it('gambar dibatasi lebar 2560px dengan q_auto sebelum disimpan', () => {
    expect(TRANSFORMASI_MASUK.gambar).toBe('c_limit,w_2560,q_auto')
    expect(opsiUnggahan('point/gambar/a-1', 'gambar')).toEqual({
      public_id: 'point/gambar/a-1',
      resource_type: 'image',
      overwrite: false,
      transformation: 'c_limit,w_2560,q_auto',
      allowed_formats: 'jpg,png,webp,avif,gif',
    })
  })

  it('video dibatasi 1920px sisi terpanjang dan 6 Mbps, lalu turunan dibuat eager async', () => {
    expect(TRANSFORMASI_MASUK.video).toBe('c_limit,w_1920,h_1920,br_6m,q_auto')
    expect(opsiUnggahan('point/video/b-2', 'video')).toEqual({
      public_id: 'point/video/b-2',
      resource_type: 'video',
      overwrite: false,
      transformation: 'c_limit,w_1920,h_1920,br_6m,q_auto',
      allowed_formats: 'mp4,webm',
      eager: EAGER_VIDEO,
      eager_async: true,
    })
  })
})

describe('parameterTandaTangan', () => {
  it('berisi persis parameter yang dikirim browser, tanpa file, api_key, dan resource_type', () => {
    expect(parameterTandaTangan('point/video/b-2', 'video', 1793744000)).toEqual({
      allowed_formats: 'mp4,webm',
      eager: 'sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4',
      eager_async: 'true',
      overwrite: 'false',
      public_id: 'point/video/b-2',
      timestamp: '1793744000',
      transformation: 'c_limit,w_1920,h_1920,br_6m,q_auto',
    })
    expect(parameterTandaTangan('point/gambar/a-1', 'gambar', 1793744000)).toEqual({
      allowed_formats: 'jpg,png,webp,avif,gif',
      overwrite: 'false',
      public_id: 'point/gambar/a-1',
      timestamp: '1793744000',
      transformation: 'c_limit,w_2560,q_auto',
    })
  })
})

describe('siapkanUnggahan', () => {
  it('mengarahkan browser ke endpoint unggah sesuai jenis dengan field bertanda tangan', () => {
    const klien = klienPalsu('demo')
    const hasil = siapkanUnggahan(klien, {
      namaFile: 'Infografis PPh.png',
      mimeType: 'image/png',
      waktu: 1793744000,
      akhiran: () => 'abcd1234',
    })
    const parameter = parameterTandaTangan('point/gambar/infografis-pph-abcd1234', 'gambar', 1793744000)
    expect(hasil).toEqual({
      publicId: 'point/gambar/infografis-pph-abcd1234',
      jenis: 'gambar',
      urlUnggah: 'https://api.cloudinary.com/v1_1/demo/image/upload',
      field: { ...parameter, api_key: 'kunci-palsu', signature: klien.tandaTangan(parameter) },
    })
    expect(siapkanUnggahan(klien, { namaFile: 'a.mp4', mimeType: 'video/mp4', waktu: 1 }).urlUnggah).toBe(
      'https://api.cloudinary.com/v1_1/demo/video/upload',
    )
  })
})

describe('unggah', () => {
  it('mengunggah lewat klien dan mengembalikan publicId serta metadata hasil Cloudinary', async () => {
    const klien = klienPalsu()
    const hasil = await unggah(klien, {
      namaFile: 'Grafik Inflasi.png',
      mimeType: 'image/png',
      buffer: Buffer.from('png'),
      width: 3000,
      height: 1500,
    })
    expect(hasil.publicId).toMatch(/^point\/gambar\/grafik-inflasi-[0-9a-f]{8}$/)
    expect(hasil.meta).toEqual({ jenis: 'gambar', width: 2560, height: 1280, bytes: 3, durasi: null, format: 'png' })
    expect(klien.aset.get(hasil.publicId)?.opsi).toEqual(opsiUnggahan(hasil.publicId, 'gambar'))
  })

  it('memakai publicId yang sudah ditentukan dan mengisi durasi video', async () => {
    const klien = klienPalsu()
    const hasil = await unggah(klien, {
      namaFile: 'thr.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(4),
      publicId: 'point/video/thr-12345678',
    })
    expect(hasil).toEqual({
      publicId: 'point/video/thr-12345678',
      meta: { jenis: 'video', width: 1080, height: 1920, bytes: 4, durasi: 30, format: 'mp4' },
    })
  })

  it('meneruskan galat Cloudinary', async () => {
    const klien = klienPalsu()
    klien.gagalSekali('File terlalu besar')
    await expect(
      unggah(klien, { namaFile: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(1) }),
    ).rejects.toThrow('File terlalu besar')
    expect(klien.aset.size).toBe(0)
  })
})

describe('klienPalsu', () => {
  it('menyimpan aset di memori, menerapkan batas lebar, dan bisa menghapus', async () => {
    const klien = klienPalsu()
    const hasil = await klien.unggah(
      { buffer: Buffer.from('isi'), mimeType: 'image/png', width: 4000, height: 2000 },
      opsiUnggahan('point/gambar/a-1', 'gambar'),
    )
    expect(hasil).toMatchObject({ publicId: 'point/gambar/a-1', resourceType: 'image', width: 2560, height: 1280, bytes: 3 })
    const potret = await klien.unggah(
      { buffer: Buffer.from('p'), mimeType: 'image/jpeg', width: 1500, height: 4000 },
      opsiUnggahan('point/gambar/p-1', 'gambar'),
    )
    expect(potret).toMatchObject({ width: 1500, height: 4000 })
    await klien.hapus('point/gambar/p-1', 'image')
    expect(klien.aset.get('point/gambar/a-1')).toMatchObject({ lewat: 'server' })
    await expect(klien.ambil('point/gambar/a-1', 'image')).resolves.toEqual(hasil)

    const unduhan = await klien.unduh(hasil)
    expect(unduhan.headers.get('content-type')).toBe('image/png')
    expect(await unduhan.text()).toBe('isi')

    await klien.hapus('point/gambar/a-1', 'image')
    expect(klien.aset.size).toBe(0)
    await expect(klien.ambil('point/gambar/a-1', 'image')).resolves.toBeNull()
    expect((await klien.unduh(hasil)).status).toBe(404)
  })

  it('meniru signed upload dari browser: tanda tangan diperiksa, transformasi diterapkan', async () => {
    const klien = klienPalsu()
    const { field } = siapkanUnggahan(klien, { namaFile: 'thr.mp4', mimeType: 'video/mp4', waktu: 1793744000 })
    const hasil = await klien.unggahDariBrowser(field, { buffer: Buffer.alloc(8), mimeType: 'video/mp4' })
    expect(hasil).toMatchObject({ resourceType: 'video', width: 1080, height: 1920, duration: 30, bytes: 8 })
    expect(klien.aset.get(field.public_id)).toMatchObject({
      lewat: 'browser',
      opsi: opsiUnggahan(field.public_id, 'video'),
    })

    const palsu = { ...field, public_id: 'point/video/lain-00000000' }
    await expect(
      klien.unggahDariBrowser(palsu, { buffer: Buffer.alloc(8), mimeType: 'video/mp4' }),
    ).rejects.toThrow('Invalid Signature')
  })

  it('tanda tangan palsu deterministik dan tidak bergantung urutan', () => {
    const klien = klienPalsu()
    expect(klien.tandaTangan({ b: '2', a: '1' })).toBe(klien.tandaTangan({ a: '1', b: '2' }))
    expect(klien.cloudName).toBe('palsu')
    expect(klien.apiKey).toBe('kunci-palsu')
  })
})
