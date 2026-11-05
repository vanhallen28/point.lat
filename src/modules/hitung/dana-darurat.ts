import { angka, isianRupiah, rp } from './gaji-bersih'
import { teksAngka } from './format'
import type { Rumus } from './rumus'

/**
 * Dana darurat sebagai kelipatan pengeluaran wajib sebulan. Kelipatan per kondisi adalah aturan
 * praktis (OJK, Sikapi Uangmu), disimpan sebagai tabel parameter: label menjadi pilihan di form.
 */

export const danaDarurat: Rumus = {
  tombol: 'Hitung dana darurat',
  sumber: ['dana-darurat'],
  parameter: [
    {
      kunci: 'kelipatan',
      label: 'Kelipatan dana darurat',
      jenis: 'tabel',
      kolom: { label: { judul: 'Kondisi' }, nilai: { judul: 'Kelipatan pengeluaran', satuan: 'kali' } },
    },
  ],
  isian: (aturan) => {
    const kondisi = aturan.tabel('kelipatan').map((b) => ({ nilai: b.label ?? '', label: b.label ?? '' }))
    return [
      isianRupiah({
        kunci: 'pengeluaran',
        label: 'Pengeluaran wajib per bulan',
        bantuan: 'Yang tetap harus dibayar walau penghasilan berhenti: makan, tempat tinggal, transport, tagihan, dan cicilan.',
        wajib: true,
        min: 1,
        contoh: '5.000.000',
      }),
      { jenis: 'pilihan', kunci: 'kondisi', label: 'Kondisimu', bantuan: null, opsi: kondisi, contoh: kondisi[0]?.nilai ?? '' },
      isianRupiah({
        kunci: 'terkumpul',
        label: 'Dana darurat yang sudah ada',
        bantuan: 'Tabungan yang bisa dicairkan kapan saja, di luar tabungan untuk tujuan lain.',
        wajib: false,
        min: 0,
        contoh: '5.000.000',
      }),
      { jenis: 'angka', kunci: 'jangka', label: 'Target terkumpul dalam', bantuan: null, satuan: 'bulan', desimal: false, wajib: true, min: 1, maks: 120, contoh: '12' },
    ]
  },
  hitung(nilai, aturan) {
    const pengeluaran = nilai.pengeluaran as number
    const kondisi = nilai.kondisi as string
    const terkumpul = (nilai.terkumpul as number | null) ?? 0
    const jangka = nilai.jangka as number
    const kali = aturan.tabel('kelipatan').find((b) => b.label === kondisi)?.nilai ?? 0
    const target = pengeluaran * kali
    const kurang = Math.max(0, target - terkumpul)
    const perBulan = Math.ceil(kurang / jangka)
    const persen = target > 0 ? Math.min(100, Math.floor((terkumpul / target) * 100)) : 100
    return {
      utama: {
        ...angka('Target dana darurat', target),
        keterangan: kurang === 0 ? 'Dana daruratmu sudah mencapai target.' : `${teksAngka(kali, 'kali')} pengeluaran wajib sebulan.`,
      },
      ringkasan: [angka('Sudah terkumpul', persen, 'persen'), angka('Kekurangan', kurang), angka(`Sisihkan per bulan selama ${jangka} bulan`, perBulan)],
      rincian: [
        {
          judul: 'Target',
          langkah: [
            { label: 'Pengeluaran wajib per bulan', teks: rp(pengeluaran) },
            { label: 'Kelipatan', teks: teksAngka(kali, 'kali'), catatan: kondisi },
            { label: 'Target dana darurat', teks: rp(target) },
          ],
        },
        {
          judul: 'Cara mencapainya',
          langkah: [
            { label: 'Sudah terkumpul', teks: rp(terkumpul) },
            { label: 'Kekurangan', teks: rp(kurang) },
            { label: 'Sisihkan per bulan', teks: rp(perBulan), catatan: `Kekurangan dibagi ${jangka} bulan, dibulatkan ke atas.` },
          ],
        },
      ],
      catatan: 'Simpan dana darurat terpisah dari tabungan lain, di produk yang mudah dicairkan dan diawasi OJK, bukan di investasi berisiko.',
    }
  },
}
