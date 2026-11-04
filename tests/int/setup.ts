import { config } from 'dotenv'

// Tes integrasi selalu memakai database tes, tidak pernah database dev.
config({ path: '.env.test', override: true })

// Tes tidak boleh memanggil Cloudinary: tanpa kredensial, modul media memakai klien palsu.
for (const kunci of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  delete process.env[kunci]
}
