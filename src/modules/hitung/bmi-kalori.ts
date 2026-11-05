import { angka } from './gaji-bersih'
import { teksAngka } from './format'
import type { Rumus } from './rumus'

/**
 * IMT (berat / tinggi kuadrat) dengan kategori dari tabel parameter (batas atas termasuk, IMT
 * dibulatkan satu desimal), dan kebutuhan kalori: energi basal Mifflin-St Jeor (1990) dikali faktor
 * aktivitas (PAL, FAO/WHO/UNU). Koefisien rumus ada di kode; batas kategori dan faktor di CMS.
 */

/** Mifflin-St Jeor bentuk sederhana: 10 x berat + 6,25 x tinggi - 5 x usia + 5 (laki-laki) atau - 161 (perempuan). */
const MIFFLIN = { berat: 10, tinggi: 6.25, usia: 5, lakiLaki: 5, perempuan: -161 }

const satuDesimal = (n: number) => Math.round(n * 10) / 10

export const bmiKalori: Rumus = {
  tombol: 'Hitung IMT dan kalori',
  sumber: ['bmi-kalori'],
  parameter: [
    { kunci: 'kategori-imt', label: 'Kategori IMT', jenis: 'tabel', kolom: { label: { judul: 'Kategori' }, batas: { judul: 'IMT sampai', satuan: 'imt' } } },
    { kunci: 'faktor-aktivitas', label: 'Faktor aktivitas', jenis: 'tabel', kolom: { label: { judul: 'Aktivitas' }, nilai: { judul: 'Faktor', satuan: 'angka' } } },
  ],
  isian: (aturan) => {
    const aktivitas = aturan.tabel('faktor-aktivitas').map((b) => ({ nilai: b.label ?? '', label: b.label ?? '' }))
    return [
      { jenis: 'angka', kunci: 'berat', label: 'Berat badan', bantuan: null, satuan: 'kg', desimal: true, wajib: true, min: 20, maks: 300, contoh: '60' },
      { jenis: 'angka', kunci: 'tinggi', label: 'Tinggi badan', bantuan: null, satuan: 'cm', desimal: true, wajib: true, min: 100, maks: 250, contoh: '165' },
      {
        jenis: 'angka',
        kunci: 'usia',
        label: 'Usia',
        bantuan: 'Untuk usia 18 tahun ke atas. Anak dan remaja memakai grafik IMT menurut umur.',
        satuan: 'tahun',
        desimal: false,
        wajib: true,
        min: 18,
        maks: 100,
        contoh: '25',
      },
      {
        jenis: 'pilihan',
        kunci: 'jenisKelamin',
        label: 'Jenis kelamin',
        bantuan: 'Rumus energi basal membedakan laki-laki dan perempuan.',
        opsi: [
          { nilai: 'perempuan', label: 'Perempuan' },
          { nilai: 'laki-laki', label: 'Laki-laki' },
        ],
        contoh: 'perempuan',
      },
      { jenis: 'pilihan', kunci: 'aktivitas', label: 'Aktivitas harian', bantuan: null, opsi: aktivitas, contoh: aktivitas[0]?.nilai ?? '' },
    ]
  },
  hitung(nilai, aturan) {
    const berat = nilai.berat as number
    const tinggi = nilai.tinggi as number
    const usia = nilai.usia as number
    const lakiLaki = nilai.jenisKelamin === 'laki-laki'
    const meter = tinggi / 100

    const imt = satuDesimal(berat / (meter * meter))
    const kategori = aturan.tabel('kategori-imt')
    const indeks = kategori.findIndex((b) => typeof b.batas !== 'number' || imt <= b.batas)
    const label = kategori[indeks]?.label ?? ''
    const normal = kategori.findIndex((b) => b.label?.toLowerCase() === 'normal')
    const bawah = normal > 0 ? (kategori[normal - 1].batas as number) + 0.1 : null
    const atas = normal >= 0 ? kategori[normal].batas : null

    const konstanta = lakiLaki ? MIFFLIN.lakiLaki : MIFFLIN.perempuan
    const basal = MIFFLIN.berat * berat + MIFFLIN.tinggi * tinggi - MIFFLIN.usia * usia + konstanta
    const faktor = aturan.tabel('faktor-aktivitas').find((b) => b.label === nilai.aktivitas)?.nilai ?? 0
    const kalori = Math.round(basal * faktor)

    const rentang =
      bawah !== null && typeof atas === 'number'
        ? [
            {
              label: 'Berat badan normal untuk tinggimu',
              nilai: satuDesimal(bawah * meter * meter),
              satuan: 'kg' as const,
              teks: `${teksAngka(satuDesimal(bawah * meter * meter), 'kg').replace(' kg', '')} sampai ${teksAngka(satuDesimal(atas * meter * meter), 'kg')}`,
            },
          ]
        : []

    return {
      utama: { ...angka('IMT kamu', imt, 'imt'), keterangan: `Kategori: ${label.toLowerCase()}.` },
      ringkasan: [angka('Kebutuhan kalori per hari', kalori, 'kkal'), angka('Energi basal (BMR)', Math.round(basal), 'kkal'), ...rentang],
      rincian: [
        {
          judul: 'Indeks massa tubuh',
          langkah: [
            { label: 'Berat badan', teks: teksAngka(berat, 'kg') },
            { label: 'Tinggi badan', teks: `${teksAngka(meter, 'angka')} m` },
            { label: 'IMT', teks: teksAngka(imt, 'imt'), catatan: `${teksAngka(berat, 'angka')} / (${teksAngka(meter, 'angka')} x ${teksAngka(meter, 'angka')}), satu desimal` },
            { label: 'Kategori', teks: label },
          ],
        },
        {
          judul: 'Kebutuhan kalori',
          langkah: [
            {
              label: 'Energi basal (Mifflin-St Jeor)',
              teks: teksAngka(Math.round(basal), 'kkal'),
              catatan: `10 x ${teksAngka(berat, 'angka')} + 6,25 x ${teksAngka(tinggi, 'angka')} - 5 x ${usia} ${lakiLaki ? '+ 5' : '- 161'}`,
            },
            { label: 'Faktor aktivitas', teks: teksAngka(faktor, 'angka'), catatan: String(nilai.aktivitas) },
            { label: 'Kebutuhan kalori per hari', teks: teksAngka(kalori, 'kkal'), catatan: 'Energi basal x faktor aktivitas' },
          ],
        },
      ],
      catatan:
        'Perkiraan untuk orang dewasa sehat, bukan pengganti pemeriksaan tenaga kesehatan. IMT tidak membedakan otot dan lemak dan tidak dipakai untuk ibu hamil.',
    }
  },
}
