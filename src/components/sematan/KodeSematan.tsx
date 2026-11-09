import { ID_DATA_SEMATAN, serialisasiKode, skripSematan, type KodeTerpasang } from '@/modules/sematan'

/**
 * Kode sematan (spesifikasi §23) di akhir `<body>`: data JSON dan pemuat sebaris yang memasangnya di posisinya.
 * Tidak dirender bila tidak ada kode, jadi halaman tanpa kode sematan tidak membawa skrip tambahan.
 */
export function KodeSematan({ kode }: { kode: KodeTerpasang[] }) {
  if (!kode.length) return null
  return (
    <>
      <script type="application/json" id={ID_DATA_SEMATAN} dangerouslySetInnerHTML={{ __html: serialisasiKode(kode) }} />
      <script dangerouslySetInnerHTML={{ __html: skripSematan() }} />
    </>
  )
}
