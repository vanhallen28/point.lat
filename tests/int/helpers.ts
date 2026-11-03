import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

let cached: Payload | undefined

export async function getTestPayload(): Promise<Payload> {
  if (!cached) {
    cached = await getPayload({ config: await config })
  }
  return cached
}

/** Akhiran unik supaya data antar-run tidak bentrok di database tes. */
export function unik(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
