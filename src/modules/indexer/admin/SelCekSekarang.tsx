import { jedaCekManual } from '../aturan'
import { TombolCekSekarang } from './TombolCekSekarang'

type BarisStatus = { id?: number | string; path?: string | null; dimintaPada?: string | null }

/**
 * Sel kolom "Cek sekarang" di daftar Status indeks: tombol yang memajukan cek URL Inspection halaman itu.
 * Bila halaman itu baru diminta dicek (jeda 10 menit), tombol langsung tampil dibatasi dengan waktu boleh
 * lagi; kuota harian diperiksa saat tombol ditekan.
 */
export function SelCekSekarang({ rowData }: { rowData?: BarisStatus }) {
  if (!rowData?.id || !rowData.path) return null
  const jeda = jedaCekManual(rowData.dimintaPada)
  return <TombolCekSekarang id={Number(rowData.id)} path={rowData.path} bolehLagi={jeda?.toISOString() ?? null} />
}
