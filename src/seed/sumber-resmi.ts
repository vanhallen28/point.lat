/**
 * Sumber resmi awal per pilar untuk brief Asisten AI (spesifikasi §10 butir 1: "daftar sumber resmi yang
 * wajib dicek"). Daftar ini dari point., bukan dari model: brief tidak pernah memuat URL buatan AI. Pemilik
 * menyunting daftarnya di Pengaturan, Asisten AI; seed hanya mengisi bila daftar masih kosong.
 */
export const SUMBER_RESMI_AWAL: Record<string, { nama: string; url: string }[]> = {
  'uang-karier': [
    { nama: 'Direktorat Jenderal Pajak (DJP)', url: 'https://www.pajak.go.id' },
    { nama: 'BPJS Ketenagakerjaan', url: 'https://www.bpjsketenagakerjaan.go.id' },
    { nama: 'BPJS Kesehatan', url: 'https://www.bpjs-kesehatan.go.id' },
    { nama: 'Kementerian Ketenagakerjaan', url: 'https://kemnaker.go.id' },
    { nama: 'Otoritas Jasa Keuangan (OJK)', url: 'https://www.ojk.go.id' },
    { nama: 'JDIH BPK (database peraturan)', url: 'https://peraturan.bpk.go.id' },
  ],
  tekno: [
    { nama: 'Kementerian Komunikasi dan Digital', url: 'https://www.komdigi.go.id' },
    { nama: 'Badan Siber dan Sandi Negara (BSSN)', url: 'https://www.bssn.go.id' },
  ],
  belajar: [
    { nama: 'Kementerian Pendidikan Dasar dan Menengah', url: 'https://www.kemendikdasmen.go.id' },
    { nama: 'Kementerian Pendidikan Tinggi, Sains, dan Teknologi', url: 'https://www.kemdiktisaintek.go.id' },
    { nama: 'SNPMB (seleksi masuk PTN)', url: 'https://snpmb.id' },
  ],
  sehat: [
    { nama: 'Kementerian Kesehatan', url: 'https://www.kemkes.go.id' },
    { nama: 'Badan POM', url: 'https://www.pom.go.id' },
    { nama: 'World Health Organization (WHO)', url: 'https://www.who.int' },
  ],
}
