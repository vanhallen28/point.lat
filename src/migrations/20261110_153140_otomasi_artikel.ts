import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * v1.6.0 (spesifikasi §27): Otomasi artikel. Hanya menambah: koleksi `usulan-topik`, global `otomasi-artikel`
 * (otomasi mati sampai dinyalakan pemilik), dan dua nilai tugas log AI (`usulan`, `artikel`). Deploy lama tetap
 * melayani selama migrasi. Hak Data API Supabase (`anon`, `authenticated`) dicabut dari tabel dan sequence baru,
 * seperti migrasi `kunci_data_api`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_usulan_topik_tools" AS ENUM('gaji-bersih', 'thr', 'cicilan-kpr', 'dana-darurat', 'bmi-kalori', 'ipk');
  CREATE TYPE "public"."enum_usulan_topik_tipe" AS ENUM('panduan', 'explainer', 'daftar');
  CREATE TYPE "public"."enum_usulan_topik_status" AS ENUM('usulan', 'disetujui', 'ditolak', 'menulis', 'ditulis', 'terjadwal', 'terbit', 'gagal');
  CREATE TYPE "public"."enum_usulan_topik_sumber" AS ENUM('ai', 'pemilik');
  CREATE TYPE "public"."enum_otomasi_artikel_slot_terbit_hari" AS ENUM('minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu');
  CREATE TYPE "public"."enum_otomasi_artikel_slot_terbit_jam" AS ENUM('06', '09', '12', '15', '18', '21');
  ALTER TYPE "public"."enum_log_ai_tugas" ADD VALUE 'usulan';
  ALTER TYPE "public"."enum_log_ai_tugas" ADD VALUE 'artikel';
  CREATE TABLE "usulan_topik_tools" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_usulan_topik_tools",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "usulan_topik" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar NOT NULL,
  	"kata_kunci" varchar NOT NULL,
  	"pilar_id" integer NOT NULL,
  	"subkategori_id" integer,
  	"subkategori_baru_nama" varchar,
  	"subkategori_baru_slug" varchar,
  	"subkategori_baru_deskripsi" varchar,
  	"tipe" "enum_usulan_topik_tipe" DEFAULT 'panduan' NOT NULL,
  	"alasan" varchar,
  	"status" "enum_usulan_topik_status" DEFAULT 'disetujui' NOT NULL,
  	"sumber" "enum_usulan_topik_sumber" DEFAULT 'pemilik',
  	"artikel_id" integer,
  	"jadwal" timestamp(3) with time zone,
  	"waktu_ditulis" timestamp(3) with time zone,
  	"skor_seo" varchar,
  	"cek_angka" numeric,
  	"percobaan" numeric DEFAULT 0,
  	"catatan" varchar,
  	"pesan" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "otomasi_artikel_slot_terbit_hari" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_otomasi_artikel_slot_terbit_hari",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "otomasi_artikel_slot_terbit_jam" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_otomasi_artikel_slot_terbit_jam",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "otomasi_artikel" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"aktif" boolean DEFAULT false,
  	"draf_per_hari" numeric DEFAULT 1 NOT NULL,
  	"jumlah_usulan" numeric DEFAULT 8 NOT NULL,
  	"penulis_id" integer,
  	"arahan" varchar,
  	"antre_otomatis" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "otomasi_artikel_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pilar_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "usulan_topik_id" integer;
  ALTER TABLE "usulan_topik_tools" ADD CONSTRAINT "usulan_topik_tools_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."usulan_topik"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usulan_topik" ADD CONSTRAINT "usulan_topik_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "usulan_topik" ADD CONSTRAINT "usulan_topik_subkategori_id_subkategori_id_fk" FOREIGN KEY ("subkategori_id") REFERENCES "public"."subkategori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "usulan_topik" ADD CONSTRAINT "usulan_topik_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "otomasi_artikel_slot_terbit_hari" ADD CONSTRAINT "otomasi_artikel_slot_terbit_hari_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."otomasi_artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "otomasi_artikel_slot_terbit_jam" ADD CONSTRAINT "otomasi_artikel_slot_terbit_jam_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."otomasi_artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "otomasi_artikel" ADD CONSTRAINT "otomasi_artikel_penulis_id_penulis_id_fk" FOREIGN KEY ("penulis_id") REFERENCES "public"."penulis"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "otomasi_artikel_rels" ADD CONSTRAINT "otomasi_artikel_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."otomasi_artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "otomasi_artikel_rels" ADD CONSTRAINT "otomasi_artikel_rels_pilar_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "usulan_topik_tools_order_idx" ON "usulan_topik_tools" USING btree ("order");
  CREATE INDEX "usulan_topik_tools_parent_idx" ON "usulan_topik_tools" USING btree ("parent_id");
  CREATE INDEX "usulan_topik_pilar_idx" ON "usulan_topik" USING btree ("pilar_id");
  CREATE INDEX "usulan_topik_subkategori_idx" ON "usulan_topik" USING btree ("subkategori_id");
  CREATE INDEX "usulan_topik_status_idx" ON "usulan_topik" USING btree ("status");
  CREATE INDEX "usulan_topik_artikel_idx" ON "usulan_topik" USING btree ("artikel_id");
  CREATE INDEX "usulan_topik_waktu_ditulis_idx" ON "usulan_topik" USING btree ("waktu_ditulis");
  CREATE INDEX "usulan_topik_updated_at_idx" ON "usulan_topik" USING btree ("updated_at");
  CREATE INDEX "usulan_topik_created_at_idx" ON "usulan_topik" USING btree ("created_at");
  CREATE INDEX "otomasi_artikel_slot_terbit_hari_order_idx" ON "otomasi_artikel_slot_terbit_hari" USING btree ("order");
  CREATE INDEX "otomasi_artikel_slot_terbit_hari_parent_idx" ON "otomasi_artikel_slot_terbit_hari" USING btree ("parent_id");
  CREATE INDEX "otomasi_artikel_slot_terbit_jam_order_idx" ON "otomasi_artikel_slot_terbit_jam" USING btree ("order");
  CREATE INDEX "otomasi_artikel_slot_terbit_jam_parent_idx" ON "otomasi_artikel_slot_terbit_jam" USING btree ("parent_id");
  CREATE INDEX "otomasi_artikel_penulis_idx" ON "otomasi_artikel" USING btree ("penulis_id");
  CREATE INDEX "otomasi_artikel_rels_order_idx" ON "otomasi_artikel_rels" USING btree ("order");
  CREATE INDEX "otomasi_artikel_rels_parent_idx" ON "otomasi_artikel_rels" USING btree ("parent_id");
  CREATE INDEX "otomasi_artikel_rels_path_idx" ON "otomasi_artikel_rels" USING btree ("path");
  CREATE INDEX "otomasi_artikel_rels_pilar_id_idx" ON "otomasi_artikel_rels" USING btree ("pilar_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usulan_topik_fk" FOREIGN KEY ("usulan_topik_id") REFERENCES "public"."usulan_topik"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_usulan_topik_id_idx" ON "payload_locked_documents_rels" USING btree ("usulan_topik_id");`)

  await db.execute(sql`
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
      AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON "usulan_topik", "usulan_topik_tools", "otomasi_artikel", "otomasi_artikel_rels",
        "otomasi_artikel_slot_terbit_hari", "otomasi_artikel_slot_terbit_jam" FROM anon, authenticated;
      REVOKE ALL ON SEQUENCE "usulan_topik_id_seq", "usulan_topik_tools_id_seq", "otomasi_artikel_id_seq",
        "otomasi_artikel_rels_id_seq", "otomasi_artikel_slot_terbit_hari_id_seq", "otomasi_artikel_slot_terbit_jam_id_seq"
        FROM anon, authenticated;
    END IF;
  END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "usulan_topik_tools" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "usulan_topik" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "otomasi_artikel_slot_terbit_hari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "otomasi_artikel_slot_terbit_jam" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "otomasi_artikel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "otomasi_artikel_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "usulan_topik_tools" CASCADE;
  DROP TABLE "usulan_topik" CASCADE;
  DROP TABLE "otomasi_artikel_slot_terbit_hari" CASCADE;
  DROP TABLE "otomasi_artikel_slot_terbit_jam" CASCADE;
  DROP TABLE "otomasi_artikel" CASCADE;
  DROP TABLE "otomasi_artikel_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_usulan_topik_fk";
  
  ALTER TABLE "log_ai" ALTER COLUMN "tugas" SET DATA TYPE text;
  DROP TYPE "public"."enum_log_ai_tugas";
  CREATE TYPE "public"."enum_log_ai_tugas" AS ENUM('brief', 'draf', 'meta');
  ALTER TABLE "log_ai" ALTER COLUMN "tugas" SET DATA TYPE "public"."enum_log_ai_tugas" USING "tugas"::"public"."enum_log_ai_tugas";
  DROP INDEX "payload_locked_documents_rels_usulan_topik_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "usulan_topik_id";
  DROP TYPE "public"."enum_usulan_topik_tools";
  DROP TYPE "public"."enum_usulan_topik_tipe";
  DROP TYPE "public"."enum_usulan_topik_status";
  DROP TYPE "public"."enum_usulan_topik_sumber";
  DROP TYPE "public"."enum_otomasi_artikel_slot_terbit_hari";
  DROP TYPE "public"."enum_otomasi_artikel_slot_terbit_jam";`)
}
