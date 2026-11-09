import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Rencana 9 (v1.2.0, spesifikasi §23): koleksi `pesan-masuk` dan `pelanggan-newsletter`, global `fitur` dan
 * `kode-sematan`, blok halaman `formKontak`, dan kolom `cara` serta `diArtikel` di global `newsletter`. Hanya menambah
 * tabel dan kolom (deploy lama tetap melayani selama migrasi). Setelah skema dibuat:
 * - perilaku newsletter yang sudah ada dipertahankan: global yang sudah punya URL form penyedia memakai cara
 *   `penyedia`, dan saklar lama `newsletter.aktif` disalin ke saklar Newsletter di global `fitur`;
 * - hak Data API Supabase (`anon`, `authenticated`) dicabut juga dari tabel baru, seperti migrasi `kunci_data_api`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pesan_masuk_status" AS ENUM('baru', 'dibaca', 'selesai');
  CREATE TYPE "public"."enum_pesan_masuk_topik" AS ENUM('koreksi', 'hak-jawab', 'kerja-sama', 'lainnya');
  CREATE TYPE "public"."enum_newsletter_cara" AS ENUM('form', 'penyedia');
  CREATE TYPE "public"."enum_kode_sematan_kode_posisi" AS ENUM('head', 'bodyAwal', 'bodyAkhir');
  CREATE TYPE "public"."enum_kode_sematan_kode_jenis" AS ENUM('persetujuan', 'wajib');
  CREATE TABLE "halaman_blocks_form_kontak" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Kirim pesan',
  	"pengantar" varchar DEFAULT 'Untuk koreksi, hak jawab, atau kerja sama. Kami membaca setiap pesan dan membalas lewat email bila perlu.',
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_form_kontak" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Kirim pesan',
  	"pengantar" varchar DEFAULT 'Untuk koreksi, hak jawab, atau kerja sama. Kami membaca setiap pesan dan membalas lewat email bila perlu.',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pesan_masuk" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_pesan_masuk_status" DEFAULT 'baru' NOT NULL,
  	"nama" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"topik" "enum_pesan_masuk_topik" NOT NULL,
  	"pesan" varchar NOT NULL,
  	"asal" varchar,
  	"sidik" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pelanggan_newsletter" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"sumber" varchar,
  	"disetujui_pada" timestamp(3) with time zone NOT NULL,
  	"sidik" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fitur" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_kontak" boolean DEFAULT false,
  	"newsletter" boolean DEFAULT false,
  	"tombol_bagikan" boolean DEFAULT false,
  	"daftar_isi" boolean DEFAULT true,
  	"waktu_baca" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "kode_sematan_kode" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nama" varchar NOT NULL,
  	"aktif" boolean DEFAULT true,
  	"posisi" "enum_kode_sematan_kode_posisi" DEFAULT 'head' NOT NULL,
  	"jenis" "enum_kode_sematan_kode_jenis" DEFAULT 'persetujuan' NOT NULL,
  	"kuki" varchar,
  	"kode" varchar NOT NULL
  );
  
  CREATE TABLE "kode_sematan" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pesan_masuk_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pelanggan_newsletter_id" integer;
  ALTER TABLE "newsletter" ADD COLUMN "cara" "enum_newsletter_cara" DEFAULT 'form' NOT NULL;
  ALTER TABLE "newsletter" ADD COLUMN "di_artikel" boolean DEFAULT false;
  ALTER TABLE "halaman_blocks_form_kontak" ADD CONSTRAINT "halaman_blocks_form_kontak_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_form_kontak" ADD CONSTRAINT "_halaman_v_blocks_form_kontak_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kode_sematan_kode" ADD CONSTRAINT "kode_sematan_kode_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kode_sematan"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "halaman_blocks_form_kontak_order_idx" ON "halaman_blocks_form_kontak" USING btree ("_order");
  CREATE INDEX "halaman_blocks_form_kontak_parent_id_idx" ON "halaman_blocks_form_kontak" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_form_kontak_path_idx" ON "halaman_blocks_form_kontak" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_form_kontak_order_idx" ON "_halaman_v_blocks_form_kontak" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_form_kontak_parent_id_idx" ON "_halaman_v_blocks_form_kontak" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_form_kontak_path_idx" ON "_halaman_v_blocks_form_kontak" USING btree ("_path");
  CREATE INDEX "pesan_masuk_status_idx" ON "pesan_masuk" USING btree ("status");
  CREATE INDEX "pesan_masuk_sidik_idx" ON "pesan_masuk" USING btree ("sidik");
  CREATE INDEX "pesan_masuk_updated_at_idx" ON "pesan_masuk" USING btree ("updated_at");
  CREATE INDEX "pesan_masuk_created_at_idx" ON "pesan_masuk" USING btree ("created_at");
  CREATE UNIQUE INDEX "pelanggan_newsletter_email_idx" ON "pelanggan_newsletter" USING btree ("email");
  CREATE INDEX "pelanggan_newsletter_sidik_idx" ON "pelanggan_newsletter" USING btree ("sidik");
  CREATE INDEX "pelanggan_newsletter_updated_at_idx" ON "pelanggan_newsletter" USING btree ("updated_at");
  CREATE INDEX "pelanggan_newsletter_created_at_idx" ON "pelanggan_newsletter" USING btree ("created_at");
  CREATE INDEX "kode_sematan_kode_order_idx" ON "kode_sematan_kode" USING btree ("_order");
  CREATE INDEX "kode_sematan_kode_parent_id_idx" ON "kode_sematan_kode" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pesan_masuk_fk" FOREIGN KEY ("pesan_masuk_id") REFERENCES "public"."pesan_masuk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pelanggan_newsletter_fk" FOREIGN KEY ("pelanggan_newsletter_id") REFERENCES "public"."pelanggan_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pesan_masuk_id_idx" ON "payload_locked_documents_rels" USING btree ("pesan_masuk_id");
  CREATE INDEX "payload_locked_documents_rels_pelanggan_newsletter_id_idx" ON "payload_locked_documents_rels" USING btree ("pelanggan_newsletter_id");`)

  await db.execute(sql`
  UPDATE "newsletter" SET "cara" = 'penyedia' WHERE coalesce(trim("url_form"), '') <> '';
  INSERT INTO "fitur" ("form_kontak", "newsletter", "tombol_bagikan", "daftar_isi", "waktu_baca", "updated_at", "created_at")
    SELECT false, coalesce("aktif", false), false, true, true, now(), now() FROM "newsletter" ORDER BY "id" LIMIT 1;
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
      AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON "halaman_blocks_form_kontak", "_halaman_v_blocks_form_kontak", "pesan_masuk", "pelanggan_newsletter",
        "fitur", "kode_sematan_kode", "kode_sematan" FROM anon, authenticated;
      REVOKE ALL ON SEQUENCE "_halaman_v_blocks_form_kontak_id_seq", "pesan_masuk_id_seq", "pelanggan_newsletter_id_seq", "fitur_id_seq",
        "kode_sematan_id_seq" FROM anon, authenticated;
    END IF;
  END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "halaman_blocks_form_kontak" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_halaman_v_blocks_form_kontak" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pesan_masuk" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pelanggan_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "fitur" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kode_sematan_kode" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kode_sematan" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "halaman_blocks_form_kontak" CASCADE;
  DROP TABLE "_halaman_v_blocks_form_kontak" CASCADE;
  DROP TABLE "pesan_masuk" CASCADE;
  DROP TABLE "pelanggan_newsletter" CASCADE;
  DROP TABLE "fitur" CASCADE;
  DROP TABLE "kode_sematan_kode" CASCADE;
  DROP TABLE "kode_sematan" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pesan_masuk_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pelanggan_newsletter_fk";
  
  DROP INDEX "payload_locked_documents_rels_pesan_masuk_id_idx";
  DROP INDEX "payload_locked_documents_rels_pelanggan_newsletter_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pesan_masuk_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pelanggan_newsletter_id";
  ALTER TABLE "newsletter" DROP COLUMN "cara";
  ALTER TABLE "newsletter" DROP COLUMN "di_artikel";
  DROP TYPE "public"."enum_pesan_masuk_status";
  DROP TYPE "public"."enum_pesan_masuk_topik";
  DROP TYPE "public"."enum_newsletter_cara";
  DROP TYPE "public"."enum_kode_sematan_kode_posisi";
  DROP TYPE "public"."enum_kode_sematan_kode_jenis";`)
}
