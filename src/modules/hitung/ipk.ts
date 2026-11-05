import { angka } from './gaji-bersih'
import { teksAngka } from './format'
import type { HasilRumus, Rumus } from './rumus'

/**
 * IP dan IPK: jumlah SKS x angka mutu dibagi jumlah SKS (Permendikbud 3/2020 Pasal 26). Konversi nilai
 * huruf ke angka ada di tabel parameter karena berbeda antarkampus; hurufnya menjadi pilihan di form.
 */

const duaDesimal = (n: number) => Math.round(n * 100) / 100

export const ipk: Rumus = {
  tombol: 'Hitung IPK',
  lanjutan: 'Gabungkan dengan IPK sebelumnya',
  sumber: ['ipk'],
  parameter: [
    {
      kunci: 'konversi-nilai',
      label: 'Konversi nilai huruf',
      jenis: 'tabel',
      kolom: { label: { judul: 'Huruf' }, nilai: { judul: 'Angka mutu', satuan: 'ipk' } },
    },
  ],
  isian: (aturan) => {
    const huruf = aturan.tabel('konversi-nilai').map((b) => ({ nilai: b.label ?? '', label: b.label ?? '' }))
    return [
      {
        jenis: 'baris',
        kunci: 'matkul',
        label: 'Mata kuliah semester ini',
        bantuan: 'Isi SKS dan nilai huruf setiap mata kuliah. Baris yang kosong dilewati.',
        labelBaris: 'Mata kuliah',
        maks: 30,
        contoh: [
          ['3', 'A'],
          ['3', 'B+'],
          ['2', 'A-'],
          ['3', 'B'],
          ['2', 'A'],
        ],
        kolom: [
          { jenis: 'angka', kunci: 'sks', label: 'SKS', bantuan: null, satuan: 'sks', desimal: false, wajib: true, min: 1, maks: 24, contoh: '3' },
          { jenis: 'pilihan', kunci: 'nilai', label: 'Nilai huruf', bantuan: null, opsi: huruf, contoh: huruf[0]?.nilai ?? '' },
        ],
      },
      {
        jenis: 'angka',
        kunci: 'ipkLama',
        label: 'IPK sebelumnya',
        bantuan: 'Isi bersama SKS yang sudah ditempuh untuk menghitung IPK baru. Kosongkan bila ini semester pertama.',
        lanjutan: true,
        satuan: 'ipk',
        desimal: true,
        wajib: false,
        min: 0,
        maks: 4,
        contoh: '',
        petunjuk: '3,40',
      },
      {
        jenis: 'angka',
        kunci: 'sksLama',
        label: 'SKS yang sudah ditempuh',
        bantuan: null,
        lanjutan: true,
        satuan: 'sks',
        desimal: false,
        wajib: false,
        min: 0,
        maks: 300,
        contoh: '',
        petunjuk: '40',
      },
    ]
  },
  hitung(nilai, aturan): HasilRumus | { galat: Record<string, string> } {
    const sks = nilai.sks as number[]
    const huruf = nilai.nilai as string[]
    const ipkLama = nilai.ipkLama as number | null
    const sksLama = nilai.sksLama as number | null
    if (ipkLama === null && sksLama !== null) return { galat: { ipkLama: 'Isi IPK sebelumnya, atau kosongkan SKS yang sudah ditempuh.' } }
    if (ipkLama !== null && sksLama === null) return { galat: { sksLama: 'Isi SKS yang sudah ditempuh, atau kosongkan IPK sebelumnya.' } }
    const konversi = aturan.tabel('konversi-nilai')
    const bobot = huruf.map((h) => konversi.find((b) => b.label === h)?.nilai ?? 0)
    const mutu = duaDesimal(sks.reduce((jumlah, s, i) => jumlah + s * bobot[i], 0))
    const totalSks = sks.reduce((a, b) => a + b, 0)
    const ip = duaDesimal(mutu / totalSks)
    const lama = ipkLama !== null && sksLama !== null && sksLama > 0
    const mutuLama = lama ? duaDesimal(ipkLama * sksLama) : 0
    const semuaSks = totalSks + (lama ? sksLama : 0)
    const ipkBaru = duaDesimal((mutu + mutuLama) / semuaSks)

    const matkul = sks.map((s, i) => ({
      label: `Mata kuliah ${i + 1}: ${s} SKS, nilai ${huruf[i]}`,
      teks: teksAngka(duaDesimal(s * bobot[i]), 'angka'),
      catatan: `${s} x ${teksAngka(bobot[i], 'ipk')}`,
    }))

    return {
      utama: lama
        ? { ...angka('IPK baru', ipkBaru, 'ipk'), keterangan: `Gabungan ${semuaSks} SKS.` }
        : { ...angka('IPK', ip, 'ipk'), keterangan: `Dari ${totalSks} SKS yang kamu isi.` },
      ringkasan: lama
        ? [angka('IP semester ini', ip, 'ipk'), angka('SKS semester ini', totalSks, 'sks'), angka('Total SKS', semuaSks, 'sks')]
        : [angka('Total SKS', totalSks, 'sks'), angka('Total mutu', mutu, 'angka')],
      rincian: [
        { judul: 'Mutu per mata kuliah', langkah: matkul },
        {
          judul: lama ? 'IP semester ini' : 'IPK',
          langkah: [
            { label: 'Total mutu', teks: teksAngka(mutu, 'angka') },
            { label: 'Total SKS', teks: teksAngka(totalSks, 'sks') },
            { label: lama ? 'IP semester ini' : 'IPK', teks: teksAngka(ip, 'ipk'), catatan: 'Total mutu dibagi total SKS, dua desimal' },
          ],
        },
        ...(lama
          ? [
              {
                judul: 'IPK baru',
                langkah: [
                  { label: 'Mutu sebelumnya', teks: teksAngka(mutuLama, 'angka'), catatan: `${teksAngka(ipkLama, 'ipk')} x ${sksLama} SKS` },
                  { label: 'Total mutu', teks: teksAngka(duaDesimal(mutu + mutuLama), 'angka') },
                  { label: 'Total SKS', teks: teksAngka(semuaSks, 'sks') },
                  { label: 'IPK baru', teks: teksAngka(ipkBaru, 'ipk') },
                ],
              },
            ]
          : []),
      ],
      catatan:
        'Konversi nilai huruf ke angka berbeda antarkampus, begitu juga pembulatannya. Cek peraturan akademik kampusmu sebelum memakai angka ini untuk syarat beasiswa atau kelulusan.',
    }
  },
}
