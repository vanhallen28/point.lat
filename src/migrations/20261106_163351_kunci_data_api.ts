import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Data API Supabase (PostgREST) tidak boleh menjangkau tabel Payload. Di proyek Supabase, tabel yang dibuat
 * `postgres` di skema `public` otomatis diberi hak baca dan tulis untuk `anon` dan `authenticated`, jadi siapa pun
 * yang memegang kunci publik proyek bisa membaca tabel seperti `pengguna` lewat REST bila Data API menyala.
 * Migrasi ini mencabut hak itu untuk tabel, sequence, dan fungsi yang ada, juga hak bawaan untuk yang dibuat
 * migrasi berikutnya. Database tanpa role Supabase (lokal, tes, CI) tidak diubah. Pemilik juga mematikan Data
 * API di dashboard (runbook rilis).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
      END IF;
    END $$;
  `)
}

/** Hak Data API tidak dikembalikan: membukanya lagi harus keputusan sadar, bukan efek `migrate:down`. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
