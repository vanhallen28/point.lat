import { config } from 'dotenv'

// Tes integrasi selalu memakai database tes, tidak pernah database dev.
config({ path: '.env.test', override: true })
