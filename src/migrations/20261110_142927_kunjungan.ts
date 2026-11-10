import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * v1.5.0 (spesifikasi §26): statistik kunjungan. Hanya menambah tabel `kunjungan` (baris mentah, 13 bulan),
 * `kunjungan_harian` (total per hari, selamanya), dan kolom saklar `fitur.statistik_kunjungan` (bawaan menyala, juga
 * untuk baris Fitur yang sudah ada), jadi deploy lama tetap melayani selama migrasi. Hak Data API Supabase (`anon`,
 * `authenticated`) dicabut dari kedua tabel dan sequence-nya, seperti migrasi `kunci_data_api`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "kunjungan" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"waktu" timestamp(3) with time zone NOT NULL,
  	"tanggal" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"negara" varchar,
  	"kota" varchar,
  	"kanal" varchar NOT NULL,
  	"sumber" varchar NOT NULL,
  	"perujuk" varchar,
  	"perangkat" varchar NOT NULL,
  	"peramban" varchar NOT NULL,
  	"sidik" varchar NOT NULL,
  	"baru" boolean,
  	"masuk" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "kunjungan_harian" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tanggal" varchar NOT NULL,
  	"tayangan" numeric DEFAULT 0 NOT NULL,
  	"pengunjung" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "kunjungan_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "kunjungan_harian_id" integer;
  ALTER TABLE "fitur" ADD COLUMN "statistik_kunjungan" boolean DEFAULT true;
  CREATE INDEX "kunjungan_waktu_idx" ON "kunjungan" USING btree ("waktu");
  CREATE INDEX "kunjungan_tanggal_idx" ON "kunjungan" USING btree ("tanggal");
  CREATE INDEX "kunjungan_updated_at_idx" ON "kunjungan" USING btree ("updated_at");
  CREATE INDEX "kunjungan_created_at_idx" ON "kunjungan" USING btree ("created_at");
  CREATE INDEX "sidik_tanggal_idx" ON "kunjungan" USING btree ("sidik","tanggal");
  CREATE UNIQUE INDEX "kunjungan_harian_tanggal_idx" ON "kunjungan_harian" USING btree ("tanggal");
  CREATE INDEX "kunjungan_harian_updated_at_idx" ON "kunjungan_harian" USING btree ("updated_at");
  CREATE INDEX "kunjungan_harian_created_at_idx" ON "kunjungan_harian" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_kunjungan_fk" FOREIGN KEY ("kunjungan_id") REFERENCES "public"."kunjungan"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_kunjungan_harian_fk" FOREIGN KEY ("kunjungan_harian_id") REFERENCES "public"."kunjungan_harian"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_kunjungan_id_idx" ON "payload_locked_documents_rels" USING btree ("kunjungan_id");
  CREATE INDEX "payload_locked_documents_rels_kunjungan_harian_id_idx" ON "payload_locked_documents_rels" USING btree ("kunjungan_harian_id");`)

  await db.execute(sql`
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
      AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON "kunjungan", "kunjungan_harian" FROM anon, authenticated;
      REVOKE ALL ON SEQUENCE "kunjungan_id_seq", "kunjungan_harian_id_seq" FROM anon, authenticated;
    END IF;
  END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "kunjungan" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kunjungan_harian" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "kunjungan" CASCADE;
  DROP TABLE "kunjungan_harian" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_kunjungan_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_kunjungan_harian_fk";
  
  DROP INDEX "payload_locked_documents_rels_kunjungan_id_idx";
  DROP INDEX "payload_locked_documents_rels_kunjungan_harian_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "kunjungan_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "kunjungan_harian_id";
  ALTER TABLE "fitur" DROP COLUMN "statistik_kunjungan";`)
}
