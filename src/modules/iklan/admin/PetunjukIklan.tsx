import './iklan.scss'

/**
 * Penjelasan di atas global Iklan (field `ui`). Ditulis di komponen, bukan `admin.description`, supaya
 * warnanya memakai teks utama tema (deskripsi bawaan Payload gagal kontras).
 */
export function PetunjukIklan() {
  return (
    <div className="iklan-petunjuk">
      <p>
        Iklan hanya dimuat untuk pengunjung yang memilih <strong>Izinkan semua</strong> di banner cookie. Pengunjung yang memilih{' '}
        <strong>Hanya yang perlu</strong> tidak melihat iklan.
      </p>
      <ul>
        <li>Nyalakan Tampilkan iklan setelah situs disetujui AdSense dan halaman Kebijakan Privasi terbit.</li>
        <li>Buat unit iklan display berukuran tetap di AdSense dengan ukuran yang sama dengan slot, lalu salin angka data-ad-slot ke Unit iklan.</li>
        <li>Satu slot aktif per posisi. Slot beranda dipasang lewat blok Slot iklan di global Beranda dengan ID slot yang sama.</li>
        <li>Iklan tidak pernah tampil di kotak Intinya, di atas judul, atau di dalam kalkulator.</li>
      </ul>
    </div>
  )
}
