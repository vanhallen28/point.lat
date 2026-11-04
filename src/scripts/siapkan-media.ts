import { klienDariEnv } from '@/modules/media'
import { siapkanCloudinary } from '@/modules/media/siapkan'

const klien = klienDariEnv()
if (klien.cloudName === 'palsu') {
  console.error('Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di .env dulu.')
  process.exit(1)
}

const hasil = await siapkanCloudinary(klien)
console.log(`Cloudinary siap. Kanvas OG: ${hasil.kanvas}.`)
process.exit(0)
