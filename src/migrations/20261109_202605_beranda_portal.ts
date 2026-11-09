import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { paragrafLexical } from '@/lib/lexical'
import { MOZAIK_PAKET } from '@/modules/paket/paket-awal'
import { pasangBerandaPortal } from '@/modules/paket/beranda'
import { perbaikiDrafPaket } from '@/modules/paket/perbaiki'
import { ISI_HALAMAN_AWAL } from '@/seed/seed'

/**
 * v1.4.0 (spesifikasi §25): blok beranda Baris rubrik dan Strip kalkulator. Hanya menambah tabel dan kolom (deploy
 * lama tetap melayani selama migrasi). Setelah skema dibuat:
 * - hak Data API Supabase (`anon`, `authenticated`) dicabut dari tabel baru, seperti migrasi `kunci_data_api`;
 * - beranda yang sudah ada mendapat tata letak portal (`pasangBerandaPortal`): mozaik "Pilihan redaksi" berisi artikel
 *   paket bila sudah diimpor, strip kalkulator, dan baris rubrik, hanya yang belum ada dan hanya bila beranda tidak punya
 *   perubahan yang belum diterbitkan;
 * - situs yang sudah berisi halaman awal mendapat draf halaman Redaksi (kotak redaksi) bila belum ada. Database kosong
 *   (CI) dilewati: halaman itu dibuat `npm run seed`;
 * - draf artikel paket v1.3.0 dengan kolom tabel tanpa judul (artikel THR) diperbaiki supaya bisa diterbitkan.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "beranda_blocks_baris_rubrik" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"jumlah" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda_blocks_strip_tools" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Hitung sendiri',
  	"teks" varchar DEFAULT 'Kalkulator dengan rumus dan sumber aturannya, gratis dan tanpa daftar.',
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_baris_rubrik" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"jumlah" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_strip_tools" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Hitung sendiri',
  	"teks" varchar DEFAULT 'Kalkulator dengan rumus dan sumber aturannya, gratis dan tanpa daftar.',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "beranda_rels" ADD COLUMN "pilar_id" integer;
  ALTER TABLE "_beranda_v_rels" ADD COLUMN "pilar_id" integer;
  ALTER TABLE "beranda_blocks_baris_rubrik" ADD CONSTRAINT "beranda_blocks_baris_rubrik_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_strip_tools" ADD CONSTRAINT "beranda_blocks_strip_tools_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_baris_rubrik" ADD CONSTRAINT "_beranda_v_blocks_baris_rubrik_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_strip_tools" ADD CONSTRAINT "_beranda_v_blocks_strip_tools_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "beranda_blocks_baris_rubrik_order_idx" ON "beranda_blocks_baris_rubrik" USING btree ("_order");
  CREATE INDEX "beranda_blocks_baris_rubrik_parent_id_idx" ON "beranda_blocks_baris_rubrik" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_baris_rubrik_path_idx" ON "beranda_blocks_baris_rubrik" USING btree ("_path");
  CREATE INDEX "beranda_blocks_strip_tools_order_idx" ON "beranda_blocks_strip_tools" USING btree ("_order");
  CREATE INDEX "beranda_blocks_strip_tools_parent_id_idx" ON "beranda_blocks_strip_tools" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_strip_tools_path_idx" ON "beranda_blocks_strip_tools" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_baris_rubrik_order_idx" ON "_beranda_v_blocks_baris_rubrik" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_baris_rubrik_parent_id_idx" ON "_beranda_v_blocks_baris_rubrik" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_baris_rubrik_path_idx" ON "_beranda_v_blocks_baris_rubrik" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_strip_tools_order_idx" ON "_beranda_v_blocks_strip_tools" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_strip_tools_parent_id_idx" ON "_beranda_v_blocks_strip_tools" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_strip_tools_path_idx" ON "_beranda_v_blocks_strip_tools" USING btree ("_path");
  ALTER TABLE "beranda_rels" ADD CONSTRAINT "beranda_rels_pilar_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_rels" ADD CONSTRAINT "_beranda_v_rels_pilar_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "beranda_rels_pilar_id_idx" ON "beranda_rels" USING btree ("pilar_id");
  CREATE INDEX "_beranda_v_rels_pilar_id_idx" ON "_beranda_v_rels" USING btree ("pilar_id");`)

  await db.execute(sql`
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
      AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON "beranda_blocks_baris_rubrik", "beranda_blocks_strip_tools", "_beranda_v_blocks_baris_rubrik",
        "_beranda_v_blocks_strip_tools" FROM anon, authenticated;
      REVOKE ALL ON SEQUENCE "_beranda_v_blocks_baris_rubrik_id_seq", "_beranda_v_blocks_strip_tools_id_seq" FROM anon, authenticated;
    END IF;
  END $$;`)

  const { docs: mozaik } = await payload.find({
    collection: 'artikel',
    where: { slug: { in: [...MOZAIK_PAKET] } },
    draft: true,
    depth: 0,
    limit: MOZAIK_PAKET.length,
    pagination: false,
    select: { slug: true },
    req,
  })
  const idMozaik = MOZAIK_PAKET.flatMap((slug) => mozaik.filter((d) => d.slug === slug).map((d) => d.id))
  const beranda = await pasangBerandaPortal(payload, idMozaik, req)
  payload.logger.info(`Migrasi beranda_portal: tata letak beranda ${beranda}.`)

  const halaman = async (slug: string) =>
    (await payload.count({ collection: 'halaman', where: { slug: { equals: slug } }, req })).totalDocs > 0
  if ((await halaman('tentang')) && !(await halaman('redaksi'))) {
    await payload.create({
      collection: 'halaman',
      draft: true,
      data: { judul: 'Redaksi', slug: 'redaksi', tataLetak: [{ blockType: 'teks', isi: paragrafLexical(ISI_HALAMAN_AWAL.redaksi ?? []) }] },
      req,
    })
    payload.logger.info('Migrasi beranda_portal: draf halaman Redaksi dibuat.')
  }

  const diperbaiki = await perbaikiDrafPaket(payload, req)
  if (diperbaiki.length > 0) payload.logger.info(`Migrasi beranda_portal: tabel draf ${diperbaiki.join(', ')} diperbaiki.`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "beranda_blocks_baris_rubrik" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "beranda_blocks_strip_tools" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_beranda_v_blocks_baris_rubrik" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_beranda_v_blocks_strip_tools" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "beranda_blocks_baris_rubrik" CASCADE;
  DROP TABLE "beranda_blocks_strip_tools" CASCADE;
  DROP TABLE "_beranda_v_blocks_baris_rubrik" CASCADE;
  DROP TABLE "_beranda_v_blocks_strip_tools" CASCADE;
  ALTER TABLE "beranda_rels" DROP CONSTRAINT "beranda_rels_pilar_fk";
  
  ALTER TABLE "_beranda_v_rels" DROP CONSTRAINT "_beranda_v_rels_pilar_fk";
  
  DROP INDEX "beranda_rels_pilar_id_idx";
  DROP INDEX "_beranda_v_rels_pilar_id_idx";
  ALTER TABLE "beranda_rels" DROP COLUMN "pilar_id";
  ALTER TABLE "_beranda_v_rels" DROP COLUMN "pilar_id";`)
}
