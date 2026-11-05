import type { Payload } from 'payload'

import { awalBulanJakarta, teksBiaya, ZONA_ANGGARAN } from '../aturan'
import { statusAsisten } from '../status'
import { LABEL_TUGAS_AI, TUGAS_AI } from '../tipe'

import './status.scss'

const ASAL_MODEL = { 'env-tugas': 'env khusus tugas ini', env: 'env AI_MODEL', bawaan: 'bawaan' } as const

/**
 * Field `ui` di global Asisten AI (server component): mode adapter, kunci API (hanya terpasang atau belum),
 * model per tugas beserta asalnya, dan pemakaian anggaran bulan ini.
 */
export async function StatusAsisten({ payload }: { payload: Payload }) {
  const status = await statusAsisten(payload)
  const kunci = Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: ZONA_ANGGARAN }).format(awalBulanJakarta(status.bulan))
  const butir = [
    {
      label: 'Mode',
      siap: status.mode === 'asli',
      teks:
        status.mode === 'asli'
          ? 'Asli: permintaan dikirim ke API Claude.'
          : status.mode === 'palsu'
            ? 'Palsu: jawaban contoh tanpa jaringan. Isi AI_ADAPTER=asli di env produksi untuk memakai Claude.'
            : (status.pesan ?? 'Belum dipasang.'),
    },
    {
      label: 'Kunci API Claude',
      siap: kunci,
      teks: kunci ? 'ANTHROPIC_API_KEY terpasang di env server.' : 'ANTHROPIC_API_KEY belum diisi di env server.',
    },
    ...TUGAS_AI.map((t) => {
      const m = status.tugas[t]
      return {
        label: LABEL_TUGAS_AI[t],
        siap: m.adaHarga,
        teks: `${m.model} (${ASAL_MODEL[m.sumber]}).${m.adaHarga ? '' : ' Harga model ini belum ada di daftar harga, jadi tugas ini tidak bisa dipakai.'}`,
      }
    }),
    {
      label: 'Pemakaian',
      siap: status.anggaran.sisa > 0,
      teks: `${teksBiaya(status.anggaran.terpakai)} dari ${teksBiaya(status.anggaran.batas)} terpakai di ${namaBulan} (waktu Jakarta).`,
    },
  ]
  return (
    <section className="asisten-status" aria-label="Status Asisten AI">
      <p className="asisten-status__judul">Status pemasangan</p>
      <dl>
        {butir.map((b) => (
          <div key={b.label}>
            <dt>{b.label}</dt>
            <dd>
              <span className={`asisten-status__tanda asisten-status__tanda--${b.siap ? 'siap' : 'belum'}`}>{b.siap ? 'Siap' : 'Perlu dilihat'}</span> {b.teks}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
