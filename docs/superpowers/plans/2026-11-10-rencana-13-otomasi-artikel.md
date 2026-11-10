# Rencana 13: Otomasi artikel (v1.6.0)

**Tujuan:** pemilik cukup menyetujui topik dan mereview draf; usulan, penulisan, kartu sampul, jadwal terbit, dan kabar ke mesin pencari berjalan sendiri.

Permintaan pemilik 10 November 2026: "buatkan ai automation, untuk kebutuhan membuat artikel otomatis index otomatis jadi saya tinggal publish saja, jika bisa publish pun otomatis bisa di atur oleh saya sendiri schedule publish nya, anda buatkan workflow automation nya".

**Keputusan pemilik** (ditanyakan sebelum mulai):
1. review lalu antre ke slot jadwal;
2. topik diusulkan AI dan disetujui pemilik;
3. jumlah draf diatur di admin;
4. kartu sampul otomatis.

**Spesifikasi:** §27 di `docs/superpowers/specs/2026-11-03-point-lat-design.md`.

## Keputusan teknis

- **Satu panggilan Claude per draf**, memakai pintu `jalankan` dan anggaran Asisten AI yang sama. Brief tidak dipanggil terpisah: data brief (tautan internal, sumber resmi, kalkulator) disusun server dan dikirim bersama topik.
- **Format isi = markdown paket (§24)**, jadi `imporPaket` dipakai ulang untuk sampul, subkategori, tautan internal, kalkulator tersemat, dan tanda `pakaiDrafAi`. `imporPaket` mendapat opsi `penulis`, subkategori boleh kosong, dan tanggal akses sumber boleh kosong.
- **Kartu sampul dengan `next/og`** (bawaan Next.js) dan Archivo statis yang dibuat dari Archivo variable dengan fontTools, karena Satori tidak membaca font variable dan WOFF2.
- **Jadwal terbit = job `schedulePublish` Payload**, supaya kalender konten dan hitungan Terjadwal beranda admin ikut menampilkannya.
- **Jam slot = jam cron.** Hobby menjalankan setiap cron sekali sehari, jadi `vercel.json` memakai enam jadwal `/api/jobs/run` di jam slot dan lima jadwal `/api/usulan-topik/jalan` untuk penulisan (paling banyak satu draf per jalan, di bawah batas 300 detik).

## Tugas

1. **Tugas AI `usulan` dan `artikel`** (`prompt/usulan.ts`, `prompt/artikel.ts`):
   - prompt, skema, dan pemeriksa;
   - contoh adapter palsu;
   - `TUGAS_EDITOR` untuk endpoint sidebar;
   - jalan sistem tanpa pengguna;
   - batas tunggu per tugas tanpa kirim ulang;
   - alasan pemeriksa (`rinci`) ikut dikembalikan.
2. **Aturan murni** (`otomasi/aturan.ts`): slot berikutnya, syarat antrean (review, `[cek angka]`, gambar utama), kuota, anggaran waktu, dan ukuran kata sampul.
3. **Data dan jalan** (`otomasi/data.ts`, `jalan.ts`):
   - `mintaUsulan`, `tulisDraf`, `antrekanTerbit`, `keluarkanDariAntrean`, `ambilOtomasi`;
   - `jalankanOtomasi` dengan kunci `payload_kv`;
   - antrean juga dijalankan `jalankanJadwal`.
4. **Koleksi `usulan-topik`, global `otomasi-artikel`, endpoint** (`/jalan`, `/aksi`, `/:id/status`, `/keadaan`), ikon menu, dan ringkasan di halaman Fitur.
5. **Kartu beranda admin** (`KartuOtomasi`, `AksiOtomasi`): usulan, draf, antrean, dan tombol.
6. **Migrasi `otomasi_artikel`** dengan pencabutan hak Data API.
7. **Tes:**
   - unit: slot, syarat antrean, kuota, sampul PNG, prompt dan pemeriksa;
   - integrasi: usulan, draf lengkap, gagal tiga kali, anggaran mati, antrean dan keluarkan, kunci, kuota, endpoint;
   - E2E: kartu, setujui, tolak, tulis (ditiru), pengaturan, axe, 375 px, editor tidak melihatnya.
8. **Dokumen.** Spesifikasi §27, CHANGELOG, CLAUDE.md, runbook rilis bagian O dan D5, dan log keputusan.

## Pemeriksaan

- **Tes otomatis:** type check, lint, unit, integrasi, cek migrasi, dan E2E penuh.
- **Migrasi diuji** di database kosong, bentukan v1.1.0, dan bentukan v1.4.0, plus dengan role `anon` dan `authenticated` seperti Supabase.
- **Tangkapan layar** kartu dan sampul contoh.
