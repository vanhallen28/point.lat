import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pengguna_peran" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_media_jenis" AS ENUM('gambar', 'video');
  CREATE TYPE "public"."enum_pilar_warna" AS ENUM('hijau', 'oranye', 'kuning', 'koral');
  CREATE TYPE "public"."enum_pilar_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_subkategori_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_penulis_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_artikel_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_artikel_tipe" AS ENUM('panduan', 'explainer', 'daftar', 'glosarium');
  CREATE TYPE "public"."enum_artikel_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__artikel_v_version_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum__artikel_v_version_tipe" AS ENUM('panduan', 'explainer', 'daftar', 'glosarium');
  CREATE TYPE "public"."enum__artikel_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_tools_tool_id" AS ENUM('gaji-bersih', 'thr', 'cicilan-kpr', 'dana-darurat', 'bmi-kalori', 'ipk');
  CREATE TYPE "public"."enum_tools_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_tools_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tools_v_version_tool_id" AS ENUM('gaji-bersih', 'thr', 'cicilan-kpr', 'dana-darurat', 'bmi-kalori', 'ipk');
  CREATE TYPE "public"."enum__tools_v_version_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum__tools_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_parameter_tools_tool_id" AS ENUM('gaji-bersih', 'thr', 'cicilan-kpr', 'dana-darurat', 'bmi-kalori', 'ipk');
  CREATE TYPE "public"."enum_video_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_video_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__video_v_version_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum__video_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_halaman_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum_halaman_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__halaman_v_version_seo_tipe_schema" AS ENUM('otomatis', 'Article', 'NewsArticle');
  CREATE TYPE "public"."enum__halaman_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_redirect_kode" AS ENUM('301', '410');
  CREATE TYPE "public"."enum_redirect_sumber" AS ENUM('otomatis', 'manual');
  CREATE TYPE "public"."enum_antrean_indexing_langkah" AS ENUM('sitemap', 'indexnow', 'indexing-api', 'cek-status');
  CREATE TYPE "public"."enum_antrean_indexing_jenis" AS ENUM('terbit', 'ubah-besar', 'pindah', 'hapus');
  CREATE TYPE "public"."enum_log_indexing_jenis" AS ENUM('terbit', 'ubah-besar', 'pindah', 'hapus');
  CREATE TYPE "public"."enum_log_indexing_langkah" AS ENUM('revalidasi', 'sitemap', 'indexnow', 'indexing-api', 'cek-status');
  CREATE TYPE "public"."enum_log_indexing_adapter" AS ENUM('next', 'searchConsole', 'indexNow', 'googleIndexing', 'palsu');
  CREATE TYPE "public"."enum_log_indexing_status" AS ENUM('berhasil', 'diulang', 'gagal', 'dilewati', 'ditunda');
  CREATE TYPE "public"."enum_status_indeks_status" AS ENUM('belum-dicek', 'tidak-dikenal', 'ditemukan', 'dirayapi', 'terindeks', 'dikecualikan', 'galat');
  CREATE TYPE "public"."enum_tugas_seo_jenis" AS ENUM('analitik', 'tautan');
  CREATE TYPE "public"."enum_tugas_seo_status" AS ENUM('berjalan', 'berhasil', 'gagal', 'dilewati');
  CREATE TYPE "public"."enum_temuan_tautan_jenis" AS ENUM('rusak', 'dialihkan', 'yatim');
  CREATE TYPE "public"."enum_tautan_luar_status" AS ENUM('belum', 'baik', 'rusak', 'tidak-pasti');
  CREATE TYPE "public"."enum_log_ai_tugas" AS ENUM('brief', 'draf', 'meta');
  CREATE TYPE "public"."enum_log_ai_status" AS ENUM('berjalan', 'berhasil', 'gagal', 'anggaran-habis');
  CREATE TYPE "public"."enum_log_ai_mode" AS ENUM('asli', 'palsu');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_header_menu_jenis" AS ENUM('pilar', 'tautan');
  CREATE TYPE "public"."enum_footer_sosial_platform" AS ENUM('instagram', 'tiktok', 'youtube', 'x', 'facebook', 'threads', 'linkedin');
  CREATE TYPE "public"."enum_beranda_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__beranda_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_newsletter_penyedia" AS ENUM('belum', 'kit', 'mailchimp', 'brevo', 'lainnya');
  CREATE TYPE "public"."enum_iklan_slot_posisi" AS ENUM('artikel-tengah', 'artikel-akhir', 'rubrik', 'tools', 'beranda');
  CREATE TYPE "public"."enum_iklan_slot_ukuran" AS ENUM('persegi', 'persegi-besar', 'banner');
  CREATE TYPE "public"."enum_iklan_penyedia" AS ENUM('adsense');
  CREATE TABLE "pengguna_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "pengguna" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nama" varchar NOT NULL,
  	"peran" "enum_pengguna_peran" DEFAULT 'editor',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"kredit" varchar,
  	"public_id" varchar,
  	"jenis" "enum_media_jenis",
  	"durasi" numeric,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "pilar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nama" varchar NOT NULL,
  	"slug" varchar,
  	"warna" "enum_pilar_warna" NOT NULL,
  	"deskripsi" varchar NOT NULL,
  	"intro" jsonb,
  	"disclaimer" varchar,
  	"urutan" numeric DEFAULT 0,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_pilar_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pilar_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "subkategori" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nama" varchar NOT NULL,
  	"slug" varchar,
  	"pilar_id" integer NOT NULL,
  	"deskripsi" varchar,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_subkategori_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subkategori_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "penulis_tautan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "penulis" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nama" varchar NOT NULL,
  	"slug" varchar,
  	"foto_id" integer,
  	"bio" varchar NOT NULL,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_penulis_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "penulis_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "artikel_intinya" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"poin" varchar
  );
  
  CREATE TABLE "artikel_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pertanyaan" varchar,
  	"jawaban" varchar
  );
  
  CREATE TABLE "artikel_sumber" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"url" varchar,
  	"penerbit" varchar,
  	"diakses_pada" timestamp(3) with time zone
  );
  
  CREATE TABLE "artikel" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"deck" varchar,
  	"gambar_utama_id" integer,
  	"isi" jsonb,
  	"video_terkait_id" integer,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_artikel_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"slug" varchar,
  	"tipe" "enum_artikel_tipe" DEFAULT 'panduan',
  	"pilar_id" integer,
  	"subkategori_id" integer,
  	"penulis_id" integer,
  	"perubahan_besar" boolean DEFAULT false,
  	"pakai_draf_ai" boolean DEFAULT false,
  	"review_ai_sumber_dicek" boolean DEFAULT false,
  	"review_ai_angka_dicek" boolean DEFAULT false,
  	"review_ai_pengalaman_ditambah" boolean DEFAULT false,
  	"brief_ai" jsonb,
  	"terbit_pada" timestamp(3) with time zone,
  	"diperbarui_besar" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_artikel_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "artikel_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "artikel_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tools_id" integer,
  	"artikel_id" integer
  );
  
  CREATE TABLE "_artikel_v_version_intinya" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"poin" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_artikel_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pertanyaan" varchar,
  	"jawaban" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_artikel_v_version_sumber" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"url" varchar,
  	"penerbit" varchar,
  	"diakses_pada" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_artikel_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_judul" varchar,
  	"version_deck" varchar,
  	"version_gambar_utama_id" integer,
  	"version_isi" jsonb,
  	"version_video_terkait_id" integer,
  	"version_seo_keyphrase" varchar,
  	"version_seo_judul_s_e_o" varchar,
  	"version_seo_meta_deskripsi" varchar,
  	"version_seo_gambar_o_g_id" integer,
  	"version_seo_canonical" varchar,
  	"version_seo_tipe_schema" "enum__artikel_v_version_seo_tipe_schema" DEFAULT 'otomatis',
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_slug" varchar,
  	"version_tipe" "enum__artikel_v_version_tipe" DEFAULT 'panduan',
  	"version_pilar_id" integer,
  	"version_subkategori_id" integer,
  	"version_penulis_id" integer,
  	"version_perubahan_besar" boolean DEFAULT false,
  	"version_pakai_draf_ai" boolean DEFAULT false,
  	"version_review_ai_sumber_dicek" boolean DEFAULT false,
  	"version_review_ai_angka_dicek" boolean DEFAULT false,
  	"version_review_ai_pengalaman_ditambah" boolean DEFAULT false,
  	"version_brief_ai" jsonb,
  	"version_terbit_pada" timestamp(3) with time zone,
  	"version_diperbarui_besar" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__artikel_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_artikel_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_artikel_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tools_id" integer,
  	"artikel_id" integer
  );
  
  CREATE TABLE "tools_bantuan_input" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kunci" varchar,
  	"label" varchar,
  	"bantuan" varchar
  );
  
  CREATE TABLE "tools_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pertanyaan" varchar,
  	"jawaban" varchar
  );
  
  CREATE TABLE "tools_sumber_aturan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"url" varchar,
  	"penerbit" varchar,
  	"diakses_pada" timestamp(3) with time zone
  );
  
  CREATE TABLE "tools" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nama" varchar,
  	"slug" varchar,
  	"pilar_id" integer,
  	"tool_id" "enum_tools_tool_id",
  	"ringkasan" varchar,
  	"penjelasan" jsonb,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_tools_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tools_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "tools_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_tools_v_version_bantuan_input" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kunci" varchar,
  	"label" varchar,
  	"bantuan" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tools_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pertanyaan" varchar,
  	"jawaban" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tools_v_version_sumber_aturan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"url" varchar,
  	"penerbit" varchar,
  	"diakses_pada" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tools_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_nama" varchar,
  	"version_slug" varchar,
  	"version_pilar_id" integer,
  	"version_tool_id" "enum__tools_v_version_tool_id",
  	"version_ringkasan" varchar,
  	"version_penjelasan" jsonb,
  	"version_seo_keyphrase" varchar,
  	"version_seo_judul_s_e_o" varchar,
  	"version_seo_meta_deskripsi" varchar,
  	"version_seo_gambar_o_g_id" integer,
  	"version_seo_canonical" varchar,
  	"version_seo_tipe_schema" "enum__tools_v_version_seo_tipe_schema" DEFAULT 'otomatis',
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tools_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_tools_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "parameter_tools_tabel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"batas" numeric,
  	"nilai" numeric
  );
  
  CREATE TABLE "parameter_tools" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tool_id" "enum_parameter_tools_tool_id" NOT NULL,
  	"kunci" varchar NOT NULL,
  	"nilai" numeric,
  	"berlaku_mulai" timestamp(3) with time zone NOT NULL,
  	"berlaku_sampai" timestamp(3) with time zone,
  	"sumber_judul" varchar,
  	"sumber_url" varchar,
  	"catatan" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "video" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"slug" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"pilar_id" integer,
  	"durasi_detik" numeric,
  	"transkrip" varchar,
  	"takarir" varchar,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_video_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_video_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "video_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_video_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_judul" varchar,
  	"version_slug" varchar,
  	"version_file_id" integer,
  	"version_poster_id" integer,
  	"version_pilar_id" integer,
  	"version_durasi_detik" numeric,
  	"version_transkrip" varchar,
  	"version_takarir" varchar,
  	"version_seo_keyphrase" varchar,
  	"version_seo_judul_s_e_o" varchar,
  	"version_seo_meta_deskripsi" varchar,
  	"version_seo_gambar_o_g_id" integer,
  	"version_seo_canonical" varchar,
  	"version_seo_tipe_schema" "enum__video_v_version_seo_tipe_schema" DEFAULT 'otomatis',
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__video_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_video_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "halaman_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"subjudul" varchar,
  	"gambar_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "halaman_blocks_teks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"isi" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "halaman_blocks_kartu_kartu" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"teks" varchar,
  	"tautan" varchar
  );
  
  CREATE TABLE "halaman_blocks_kartu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "halaman_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"teks" varchar,
  	"label_tombol" varchar,
  	"tautan" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "halaman_blocks_faq_blok_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pertanyaan" varchar,
  	"jawaban" varchar
  );
  
  CREATE TABLE "halaman_blocks_faq_blok" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "halaman_blocks_embed_tool" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tool_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "halaman" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"slug" varchar,
  	"seo_keyphrase" varchar,
  	"seo_judul_s_e_o" varchar,
  	"seo_meta_deskripsi" varchar,
  	"seo_gambar_o_g_id" integer,
  	"seo_canonical" varchar,
  	"seo_tipe_schema" "enum_halaman_seo_tipe_schema" DEFAULT 'otomatis',
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_halaman_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "halaman_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"subjudul" varchar,
  	"gambar_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_teks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"isi" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_kartu_kartu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"teks" varchar,
  	"tautan" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_kartu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"teks" varchar,
  	"label_tombol" varchar,
  	"tautan" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_faq_blok_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pertanyaan" varchar,
  	"jawaban" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_faq_blok" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v_blocks_embed_tool" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tool_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_halaman_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_judul" varchar,
  	"version_slug" varchar,
  	"version_seo_keyphrase" varchar,
  	"version_seo_judul_s_e_o" varchar,
  	"version_seo_meta_deskripsi" varchar,
  	"version_seo_gambar_o_g_id" integer,
  	"version_seo_canonical" varchar,
  	"version_seo_tipe_schema" "enum__halaman_v_version_seo_tipe_schema" DEFAULT 'otomatis',
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__halaman_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_halaman_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "redirect" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dari" varchar NOT NULL,
  	"kode" "enum_redirect_kode" DEFAULT '301' NOT NULL,
  	"ke" varchar,
  	"sumber" "enum_redirect_sumber" DEFAULT 'manual',
  	"jumlah_hit" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "log_404" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL,
  	"jumlah" numeric DEFAULT 1,
  	"terakhir" timestamp(3) with time zone,
  	"referer" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "antrean_indexing" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kunci" varchar NOT NULL,
  	"langkah" "enum_antrean_indexing_langkah" NOT NULL,
  	"path" varchar NOT NULL,
  	"jenis" "enum_antrean_indexing_jenis" NOT NULL,
  	"jadwal" timestamp(3) with time zone NOT NULL,
  	"percobaan" numeric DEFAULT 0,
  	"tahap" numeric DEFAULT 0,
  	"dasar" timestamp(3) with time zone,
  	"versi" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "log_indexing" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"waktu" timestamp(3) with time zone NOT NULL,
  	"url" varchar NOT NULL,
  	"jenis" "enum_log_indexing_jenis",
  	"langkah" "enum_log_indexing_langkah" NOT NULL,
  	"adapter" "enum_log_indexing_adapter" NOT NULL,
  	"status" "enum_log_indexing_status" NOT NULL,
  	"kode_http" numeric,
  	"pesan" varchar,
  	"percobaan" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "status_indeks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL,
  	"status" "enum_status_indeks_status" DEFAULT 'belum-dicek' NOT NULL,
  	"detail" varchar,
  	"tautan_inspeksi" varchar,
  	"dirayapi_pada" timestamp(3) with time zone,
  	"cek_terakhir" timestamp(3) with time zone,
  	"cek_berikutnya" timestamp(3) with time zone,
  	"diminta_pada" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "analitik_halaman" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL,
  	"klik28" numeric NOT NULL,
  	"impresi28" numeric NOT NULL,
  	"ctr28" numeric NOT NULL,
  	"posisi28" numeric NOT NULL,
  	"klik7" numeric NOT NULL,
  	"impresi7" numeric NOT NULL,
  	"sampai" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "analitik_situs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tanggal" varchar NOT NULL,
  	"klik" numeric NOT NULL,
  	"impresi" numeric NOT NULL,
  	"ctr" numeric NOT NULL,
  	"posisi" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tugas_seo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"jenis" "enum_tugas_seo_jenis" NOT NULL,
  	"status" "enum_tugas_seo_status",
  	"mulai" timestamp(3) with time zone,
  	"selesai" timestamp(3) with time zone,
  	"berikutnya" timestamp(3) with time zone NOT NULL,
  	"pesan" varchar,
  	"versi" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "temuan_tautan" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"jenis" "enum_temuan_tautan_jenis" NOT NULL,
  	"tujuan" varchar NOT NULL,
  	"pesan" varchar NOT NULL,
  	"sumber_koleksi" varchar NOT NULL,
  	"sumber_id" varchar,
  	"sumber_judul" varchar NOT NULL,
  	"sumber_path" varchar,
  	"ditemukan" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tautan_luar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"status" "enum_tautan_luar_status" DEFAULT 'belum' NOT NULL,
  	"kode_http" numeric,
  	"pesan" varchar,
  	"dicek_pada" timestamp(3) with time zone,
  	"berikutnya" timestamp(3) with time zone NOT NULL,
  	"sumber" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "log_ai" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"waktu" timestamp(3) with time zone NOT NULL,
  	"tugas" "enum_log_ai_tugas" NOT NULL,
  	"status" "enum_log_ai_status" NOT NULL,
  	"pengguna_id" integer,
  	"dokumen_id" integer,
  	"ringkasan" varchar,
  	"model" varchar,
  	"mode" "enum_log_ai_mode",
  	"token_masuk" numeric,
  	"token_keluar" numeric,
  	"biaya" numeric,
  	"durasi_ms" numeric,
  	"pesan" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pemakaian_ai" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bulan" varchar NOT NULL,
  	"terpakai" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pengguna_id" integer,
  	"media_id" integer,
  	"pilar_id" integer,
  	"subkategori_id" integer,
  	"penulis_id" integer,
  	"artikel_id" integer,
  	"tools_id" integer,
  	"parameter_tools_id" integer,
  	"video_id" integer,
  	"halaman_id" integer,
  	"redirect_id" integer,
  	"log_404_id" integer,
  	"antrean_indexing_id" integer,
  	"log_indexing_id" integer,
  	"status_indeks_id" integer,
  	"analitik_halaman_id" integer,
  	"analitik_situs_id" integer,
  	"tugas_seo_id" integer,
  	"temuan_tautan_id" integer,
  	"tautan_luar_id" integer,
  	"log_ai_id" integer,
  	"pemakaian_ai_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pengguna_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "header_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"jenis" "enum_header_menu_jenis" DEFAULT 'pilar' NOT NULL,
  	"pilar_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "header" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tombol_tools_label" varchar DEFAULT 'Tools',
  	"tombol_tools_url" varchar DEFAULT '/tools',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_tautan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "footer_sosial" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_footer_sosial_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"saluran_whats_app" varchar,
  	"teks_hak_cipta" varchar DEFAULT '© 2026 point.lat',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "beranda_blocks_hero_beranda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Intinya dulu.',
  	"subjudul" varchar,
  	"placeholder_cari" varchar DEFAULT 'misal: cara hitung THR',
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda_blocks_mozaik_pilihan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"tampilkan_tools" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda_blocks_strip_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Intinya dalam 45 detik',
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda_blocks_paling_dibaca" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Paling dicari pekan ini',
  	"jumlah" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda_blocks_newsletter_blok" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Intinya, tiap Senin.',
  	"teks" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda_blocks_slot_iklan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"id_slot" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "beranda" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_beranda_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "beranda_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"artikel_id" integer,
  	"video_id" integer
  );
  
  CREATE TABLE "_beranda_v_blocks_hero_beranda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Intinya dulu.',
  	"subjudul" varchar,
  	"placeholder_cari" varchar DEFAULT 'misal: cara hitung THR',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_mozaik_pilihan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar,
  	"tampilkan_tools" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_strip_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Intinya dalam 45 detik',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_paling_dibaca" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Paling dicari pekan ini',
  	"jumlah" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_newsletter_blok" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"judul" varchar DEFAULT 'Intinya, tiap Senin.',
  	"teks" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v_blocks_slot_iklan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"id_slot" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_beranda_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__beranda_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_beranda_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"artikel_id" integer,
  	"video_id" integer
  );
  
  CREATE TABLE "pengaturan_seo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nama_situs" varchar DEFAULT 'point.' NOT NULL,
  	"url_situs" varchar DEFAULT 'https://point.lat' NOT NULL,
  	"pola_judul" varchar DEFAULT '%s · point.' NOT NULL,
  	"meta_default" varchar DEFAULT 'Intinya dulu. Uang, karier, teknologi, pendidikan, dan kesehatan dijelaskan dari intinya.',
  	"gambar_og_default_id" integer,
  	"organisasi_nama" varchar DEFAULT 'point.lat',
  	"organisasi_logo_id" integer,
  	"verifikasi_google" varchar,
  	"verifikasi_bing" varchar,
  	"robots_tambahan" varchar,
  	"indexing_kunci_index_now" varchar,
  	"indexing_properti_search_console" varchar DEFAULT 'sc-domain:point.lat',
  	"indexing_kuota_inspeksi" numeric DEFAULT 1000,
  	"indexing_pakai_indexing_api" boolean DEFAULT false,
  	"indexing_kuota_indexing_api" numeric DEFAULT 200,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "pengaturan_seo_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "newsletter" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"aktif" boolean DEFAULT false,
  	"penyedia" "enum_newsletter_penyedia" DEFAULT 'belum',
  	"url_form" varchar,
  	"judul" varchar DEFAULT 'Intinya, tiap Senin.',
  	"deskripsi" varchar DEFAULT 'Lima tulisan terbaik pekan ini, langsung ke email.',
  	"tautan_arsip" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "asisten_ai_harga" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"model" varchar NOT NULL,
  	"masuk" numeric NOT NULL,
  	"keluar" numeric NOT NULL
  );
  
  CREATE TABLE "asisten_ai_sumber_resmi" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pilar_id" integer NOT NULL,
  	"nama" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "asisten_ai" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"aktif" boolean DEFAULT true,
  	"anggaran_bulanan" numeric DEFAULT 10 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "asisten_ai_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "iklan_slot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"id_slot" varchar NOT NULL,
  	"posisi" "enum_iklan_slot_posisi" NOT NULL,
  	"setelah_paragraf" numeric DEFAULT 3,
  	"ukuran" "enum_iklan_slot_ukuran" DEFAULT 'persegi' NOT NULL,
  	"unit" varchar NOT NULL,
  	"aktif" boolean DEFAULT true
  );
  
  CREATE TABLE "iklan" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"aktif" boolean DEFAULT false,
  	"penyedia" "enum_iklan_penyedia" DEFAULT 'adsense' NOT NULL,
  	"id_penerbit" varchar,
  	"mode_uji" boolean DEFAULT false,
  	"ads_txt_tambahan" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "pengguna_sessions" ADD CONSTRAINT "pengguna_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pengguna"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pilar" ADD CONSTRAINT "pilar_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pilar_texts" ADD CONSTRAINT "pilar_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pilar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subkategori" ADD CONSTRAINT "subkategori_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subkategori" ADD CONSTRAINT "subkategori_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subkategori_texts" ADD CONSTRAINT "subkategori_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subkategori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "penulis_tautan" ADD CONSTRAINT "penulis_tautan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."penulis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "penulis" ADD CONSTRAINT "penulis_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "penulis" ADD CONSTRAINT "penulis_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "penulis_texts" ADD CONSTRAINT "penulis_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."penulis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel_intinya" ADD CONSTRAINT "artikel_intinya_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel_faq" ADD CONSTRAINT "artikel_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel_sumber" ADD CONSTRAINT "artikel_sumber_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel" ADD CONSTRAINT "artikel_gambar_utama_id_media_id_fk" FOREIGN KEY ("gambar_utama_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artikel" ADD CONSTRAINT "artikel_video_terkait_id_video_id_fk" FOREIGN KEY ("video_terkait_id") REFERENCES "public"."video"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artikel" ADD CONSTRAINT "artikel_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artikel" ADD CONSTRAINT "artikel_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artikel" ADD CONSTRAINT "artikel_subkategori_id_subkategori_id_fk" FOREIGN KEY ("subkategori_id") REFERENCES "public"."subkategori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artikel" ADD CONSTRAINT "artikel_penulis_id_penulis_id_fk" FOREIGN KEY ("penulis_id") REFERENCES "public"."penulis"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artikel_texts" ADD CONSTRAINT "artikel_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel_rels" ADD CONSTRAINT "artikel_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel_rels" ADD CONSTRAINT "artikel_rels_tools_fk" FOREIGN KEY ("tools_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artikel_rels" ADD CONSTRAINT "artikel_rels_artikel_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v_version_intinya" ADD CONSTRAINT "_artikel_v_version_intinya_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_artikel_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v_version_faq" ADD CONSTRAINT "_artikel_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_artikel_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v_version_sumber" ADD CONSTRAINT "_artikel_v_version_sumber_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_artikel_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_parent_id_artikel_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artikel"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_version_gambar_utama_id_media_id_fk" FOREIGN KEY ("version_gambar_utama_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_version_video_terkait_id_video_id_fk" FOREIGN KEY ("version_video_terkait_id") REFERENCES "public"."video"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_version_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("version_seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_version_pilar_id_pilar_id_fk" FOREIGN KEY ("version_pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_version_subkategori_id_subkategori_id_fk" FOREIGN KEY ("version_subkategori_id") REFERENCES "public"."subkategori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v" ADD CONSTRAINT "_artikel_v_version_penulis_id_penulis_id_fk" FOREIGN KEY ("version_penulis_id") REFERENCES "public"."penulis"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artikel_v_texts" ADD CONSTRAINT "_artikel_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_artikel_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v_rels" ADD CONSTRAINT "_artikel_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_artikel_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v_rels" ADD CONSTRAINT "_artikel_v_rels_tools_fk" FOREIGN KEY ("tools_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artikel_v_rels" ADD CONSTRAINT "_artikel_v_rels_artikel_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tools_bantuan_input" ADD CONSTRAINT "tools_bantuan_input_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tools_faq" ADD CONSTRAINT "tools_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tools_sumber_aturan" ADD CONSTRAINT "tools_sumber_aturan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tools" ADD CONSTRAINT "tools_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tools" ADD CONSTRAINT "tools_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tools_texts" ADD CONSTRAINT "tools_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tools_v_version_bantuan_input" ADD CONSTRAINT "_tools_v_version_bantuan_input_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tools_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tools_v_version_faq" ADD CONSTRAINT "_tools_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tools_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tools_v_version_sumber_aturan" ADD CONSTRAINT "_tools_v_version_sumber_aturan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tools_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tools_v" ADD CONSTRAINT "_tools_v_parent_id_tools_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tools_v" ADD CONSTRAINT "_tools_v_version_pilar_id_pilar_id_fk" FOREIGN KEY ("version_pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tools_v" ADD CONSTRAINT "_tools_v_version_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("version_seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tools_v_texts" ADD CONSTRAINT "_tools_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tools_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "parameter_tools_tabel" ADD CONSTRAINT "parameter_tools_tabel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."parameter_tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "video" ADD CONSTRAINT "video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "video" ADD CONSTRAINT "video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "video" ADD CONSTRAINT "video_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "video" ADD CONSTRAINT "video_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "video_texts" ADD CONSTRAINT "video_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_video_v" ADD CONSTRAINT "_video_v_parent_id_video_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."video"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_video_v" ADD CONSTRAINT "_video_v_version_file_id_media_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_video_v" ADD CONSTRAINT "_video_v_version_poster_id_media_id_fk" FOREIGN KEY ("version_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_video_v" ADD CONSTRAINT "_video_v_version_pilar_id_pilar_id_fk" FOREIGN KEY ("version_pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_video_v" ADD CONSTRAINT "_video_v_version_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("version_seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_video_v_texts" ADD CONSTRAINT "_video_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_video_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_hero" ADD CONSTRAINT "halaman_blocks_hero_gambar_id_media_id_fk" FOREIGN KEY ("gambar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "halaman_blocks_hero" ADD CONSTRAINT "halaman_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_teks" ADD CONSTRAINT "halaman_blocks_teks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_kartu_kartu" ADD CONSTRAINT "halaman_blocks_kartu_kartu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman_blocks_kartu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_kartu" ADD CONSTRAINT "halaman_blocks_kartu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_cta" ADD CONSTRAINT "halaman_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_faq_blok_faq" ADD CONSTRAINT "halaman_blocks_faq_blok_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman_blocks_faq_blok"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_faq_blok" ADD CONSTRAINT "halaman_blocks_faq_blok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman_blocks_embed_tool" ADD CONSTRAINT "halaman_blocks_embed_tool_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "halaman_blocks_embed_tool" ADD CONSTRAINT "halaman_blocks_embed_tool_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "halaman" ADD CONSTRAINT "halaman_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "halaman_texts" ADD CONSTRAINT "halaman_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_hero" ADD CONSTRAINT "_halaman_v_blocks_hero_gambar_id_media_id_fk" FOREIGN KEY ("gambar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_hero" ADD CONSTRAINT "_halaman_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_teks" ADD CONSTRAINT "_halaman_v_blocks_teks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_kartu_kartu" ADD CONSTRAINT "_halaman_v_blocks_kartu_kartu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v_blocks_kartu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_kartu" ADD CONSTRAINT "_halaman_v_blocks_kartu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_cta" ADD CONSTRAINT "_halaman_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_faq_blok_faq" ADD CONSTRAINT "_halaman_v_blocks_faq_blok_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v_blocks_faq_blok"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_faq_blok" ADD CONSTRAINT "_halaman_v_blocks_faq_blok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_embed_tool" ADD CONSTRAINT "_halaman_v_blocks_embed_tool_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_halaman_v_blocks_embed_tool" ADD CONSTRAINT "_halaman_v_blocks_embed_tool_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_halaman_v" ADD CONSTRAINT "_halaman_v_parent_id_halaman_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."halaman"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_halaman_v" ADD CONSTRAINT "_halaman_v_version_seo_gambar_o_g_id_media_id_fk" FOREIGN KEY ("version_seo_gambar_o_g_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_halaman_v_texts" ADD CONSTRAINT "_halaman_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_halaman_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "log_ai" ADD CONSTRAINT "log_ai_pengguna_id_pengguna_id_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."pengguna"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "log_ai" ADD CONSTRAINT "log_ai_dokumen_id_artikel_id_fk" FOREIGN KEY ("dokumen_id") REFERENCES "public"."artikel"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pengguna_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."pengguna"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pilar_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subkategori_fk" FOREIGN KEY ("subkategori_id") REFERENCES "public"."subkategori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_penulis_fk" FOREIGN KEY ("penulis_id") REFERENCES "public"."penulis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artikel_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tools_fk" FOREIGN KEY ("tools_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parameter_tools_fk" FOREIGN KEY ("parameter_tools_id") REFERENCES "public"."parameter_tools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_video_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_halaman_fk" FOREIGN KEY ("halaman_id") REFERENCES "public"."halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirect_fk" FOREIGN KEY ("redirect_id") REFERENCES "public"."redirect"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_log_404_fk" FOREIGN KEY ("log_404_id") REFERENCES "public"."log_404"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_antrean_indexing_fk" FOREIGN KEY ("antrean_indexing_id") REFERENCES "public"."antrean_indexing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_log_indexing_fk" FOREIGN KEY ("log_indexing_id") REFERENCES "public"."log_indexing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_status_indeks_fk" FOREIGN KEY ("status_indeks_id") REFERENCES "public"."status_indeks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analitik_halaman_fk" FOREIGN KEY ("analitik_halaman_id") REFERENCES "public"."analitik_halaman"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analitik_situs_fk" FOREIGN KEY ("analitik_situs_id") REFERENCES "public"."analitik_situs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tugas_seo_fk" FOREIGN KEY ("tugas_seo_id") REFERENCES "public"."tugas_seo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_temuan_tautan_fk" FOREIGN KEY ("temuan_tautan_id") REFERENCES "public"."temuan_tautan"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tautan_luar_fk" FOREIGN KEY ("tautan_luar_id") REFERENCES "public"."tautan_luar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_log_ai_fk" FOREIGN KEY ("log_ai_id") REFERENCES "public"."log_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pemakaian_ai_fk" FOREIGN KEY ("pemakaian_ai_id") REFERENCES "public"."pemakaian_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_pengguna_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."pengguna"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_menu" ADD CONSTRAINT "header_menu_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header_menu" ADD CONSTRAINT "header_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_tautan" ADD CONSTRAINT "footer_tautan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_sosial" ADD CONSTRAINT "footer_sosial_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_hero_beranda" ADD CONSTRAINT "beranda_blocks_hero_beranda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_mozaik_pilihan" ADD CONSTRAINT "beranda_blocks_mozaik_pilihan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_strip_video" ADD CONSTRAINT "beranda_blocks_strip_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_paling_dibaca" ADD CONSTRAINT "beranda_blocks_paling_dibaca_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_newsletter_blok" ADD CONSTRAINT "beranda_blocks_newsletter_blok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_blocks_slot_iklan" ADD CONSTRAINT "beranda_blocks_slot_iklan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_rels" ADD CONSTRAINT "beranda_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."beranda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_rels" ADD CONSTRAINT "beranda_rels_artikel_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "beranda_rels" ADD CONSTRAINT "beranda_rels_video_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_hero_beranda" ADD CONSTRAINT "_beranda_v_blocks_hero_beranda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_mozaik_pilihan" ADD CONSTRAINT "_beranda_v_blocks_mozaik_pilihan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_strip_video" ADD CONSTRAINT "_beranda_v_blocks_strip_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_paling_dibaca" ADD CONSTRAINT "_beranda_v_blocks_paling_dibaca_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_newsletter_blok" ADD CONSTRAINT "_beranda_v_blocks_newsletter_blok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_blocks_slot_iklan" ADD CONSTRAINT "_beranda_v_blocks_slot_iklan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_rels" ADD CONSTRAINT "_beranda_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_beranda_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_rels" ADD CONSTRAINT "_beranda_v_rels_artikel_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_beranda_v_rels" ADD CONSTRAINT "_beranda_v_rels_video_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pengaturan_seo" ADD CONSTRAINT "pengaturan_seo_gambar_og_default_id_media_id_fk" FOREIGN KEY ("gambar_og_default_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pengaturan_seo" ADD CONSTRAINT "pengaturan_seo_organisasi_logo_id_media_id_fk" FOREIGN KEY ("organisasi_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pengaturan_seo_texts" ADD CONSTRAINT "pengaturan_seo_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pengaturan_seo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "asisten_ai_harga" ADD CONSTRAINT "asisten_ai_harga_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."asisten_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "asisten_ai_sumber_resmi" ADD CONSTRAINT "asisten_ai_sumber_resmi_pilar_id_pilar_id_fk" FOREIGN KEY ("pilar_id") REFERENCES "public"."pilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "asisten_ai_sumber_resmi" ADD CONSTRAINT "asisten_ai_sumber_resmi_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."asisten_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "asisten_ai_texts" ADD CONSTRAINT "asisten_ai_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."asisten_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "iklan_slot" ADD CONSTRAINT "iklan_slot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."iklan"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pengguna_sessions_order_idx" ON "pengguna_sessions" USING btree ("_order");
  CREATE INDEX "pengguna_sessions_parent_id_idx" ON "pengguna_sessions" USING btree ("_parent_id");
  CREATE INDEX "pengguna_updated_at_idx" ON "pengguna" USING btree ("updated_at");
  CREATE INDEX "pengguna_created_at_idx" ON "pengguna" USING btree ("created_at");
  CREATE UNIQUE INDEX "pengguna_email_idx" ON "pengguna" USING btree ("email");
  CREATE INDEX "media_public_id_idx" ON "media" USING btree ("public_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "pilar_slug_idx" ON "pilar" USING btree ("slug");
  CREATE INDEX "pilar_seo_seo_gambar_o_g_idx" ON "pilar" USING btree ("seo_gambar_o_g_id");
  CREATE INDEX "pilar_updated_at_idx" ON "pilar" USING btree ("updated_at");
  CREATE INDEX "pilar_created_at_idx" ON "pilar" USING btree ("created_at");
  CREATE INDEX "pilar_texts_order_parent" ON "pilar_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "subkategori_slug_idx" ON "subkategori" USING btree ("slug");
  CREATE INDEX "subkategori_pilar_idx" ON "subkategori" USING btree ("pilar_id");
  CREATE INDEX "subkategori_seo_seo_gambar_o_g_idx" ON "subkategori" USING btree ("seo_gambar_o_g_id");
  CREATE INDEX "subkategori_updated_at_idx" ON "subkategori" USING btree ("updated_at");
  CREATE INDEX "subkategori_created_at_idx" ON "subkategori" USING btree ("created_at");
  CREATE INDEX "subkategori_texts_order_parent" ON "subkategori_texts" USING btree ("order","parent_id");
  CREATE INDEX "penulis_tautan_order_idx" ON "penulis_tautan" USING btree ("_order");
  CREATE INDEX "penulis_tautan_parent_id_idx" ON "penulis_tautan" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "penulis_slug_idx" ON "penulis" USING btree ("slug");
  CREATE INDEX "penulis_foto_idx" ON "penulis" USING btree ("foto_id");
  CREATE INDEX "penulis_seo_seo_gambar_o_g_idx" ON "penulis" USING btree ("seo_gambar_o_g_id");
  CREATE INDEX "penulis_updated_at_idx" ON "penulis" USING btree ("updated_at");
  CREATE INDEX "penulis_created_at_idx" ON "penulis" USING btree ("created_at");
  CREATE INDEX "penulis_texts_order_parent" ON "penulis_texts" USING btree ("order","parent_id");
  CREATE INDEX "artikel_intinya_order_idx" ON "artikel_intinya" USING btree ("_order");
  CREATE INDEX "artikel_intinya_parent_id_idx" ON "artikel_intinya" USING btree ("_parent_id");
  CREATE INDEX "artikel_faq_order_idx" ON "artikel_faq" USING btree ("_order");
  CREATE INDEX "artikel_faq_parent_id_idx" ON "artikel_faq" USING btree ("_parent_id");
  CREATE INDEX "artikel_sumber_order_idx" ON "artikel_sumber" USING btree ("_order");
  CREATE INDEX "artikel_sumber_parent_id_idx" ON "artikel_sumber" USING btree ("_parent_id");
  CREATE INDEX "artikel_gambar_utama_idx" ON "artikel" USING btree ("gambar_utama_id");
  CREATE INDEX "artikel_video_terkait_idx" ON "artikel" USING btree ("video_terkait_id");
  CREATE INDEX "artikel_seo_seo_gambar_o_g_idx" ON "artikel" USING btree ("seo_gambar_o_g_id");
  CREATE UNIQUE INDEX "artikel_slug_idx" ON "artikel" USING btree ("slug");
  CREATE INDEX "artikel_pilar_idx" ON "artikel" USING btree ("pilar_id");
  CREATE INDEX "artikel_subkategori_idx" ON "artikel" USING btree ("subkategori_id");
  CREATE INDEX "artikel_penulis_idx" ON "artikel" USING btree ("penulis_id");
  CREATE INDEX "artikel_updated_at_idx" ON "artikel" USING btree ("updated_at");
  CREATE INDEX "artikel_created_at_idx" ON "artikel" USING btree ("created_at");
  CREATE INDEX "artikel__status_idx" ON "artikel" USING btree ("_status");
  CREATE INDEX "artikel_texts_order_parent" ON "artikel_texts" USING btree ("order","parent_id");
  CREATE INDEX "artikel_rels_order_idx" ON "artikel_rels" USING btree ("order");
  CREATE INDEX "artikel_rels_parent_idx" ON "artikel_rels" USING btree ("parent_id");
  CREATE INDEX "artikel_rels_path_idx" ON "artikel_rels" USING btree ("path");
  CREATE INDEX "artikel_rels_tools_id_idx" ON "artikel_rels" USING btree ("tools_id");
  CREATE INDEX "artikel_rels_artikel_id_idx" ON "artikel_rels" USING btree ("artikel_id");
  CREATE INDEX "_artikel_v_version_intinya_order_idx" ON "_artikel_v_version_intinya" USING btree ("_order");
  CREATE INDEX "_artikel_v_version_intinya_parent_id_idx" ON "_artikel_v_version_intinya" USING btree ("_parent_id");
  CREATE INDEX "_artikel_v_version_faq_order_idx" ON "_artikel_v_version_faq" USING btree ("_order");
  CREATE INDEX "_artikel_v_version_faq_parent_id_idx" ON "_artikel_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_artikel_v_version_sumber_order_idx" ON "_artikel_v_version_sumber" USING btree ("_order");
  CREATE INDEX "_artikel_v_version_sumber_parent_id_idx" ON "_artikel_v_version_sumber" USING btree ("_parent_id");
  CREATE INDEX "_artikel_v_parent_idx" ON "_artikel_v" USING btree ("parent_id");
  CREATE INDEX "_artikel_v_version_version_gambar_utama_idx" ON "_artikel_v" USING btree ("version_gambar_utama_id");
  CREATE INDEX "_artikel_v_version_version_video_terkait_idx" ON "_artikel_v" USING btree ("version_video_terkait_id");
  CREATE INDEX "_artikel_v_version_seo_version_seo_gambar_o_g_idx" ON "_artikel_v" USING btree ("version_seo_gambar_o_g_id");
  CREATE INDEX "_artikel_v_version_version_slug_idx" ON "_artikel_v" USING btree ("version_slug");
  CREATE INDEX "_artikel_v_version_version_pilar_idx" ON "_artikel_v" USING btree ("version_pilar_id");
  CREATE INDEX "_artikel_v_version_version_subkategori_idx" ON "_artikel_v" USING btree ("version_subkategori_id");
  CREATE INDEX "_artikel_v_version_version_penulis_idx" ON "_artikel_v" USING btree ("version_penulis_id");
  CREATE INDEX "_artikel_v_version_version_updated_at_idx" ON "_artikel_v" USING btree ("version_updated_at");
  CREATE INDEX "_artikel_v_version_version_created_at_idx" ON "_artikel_v" USING btree ("version_created_at");
  CREATE INDEX "_artikel_v_version_version__status_idx" ON "_artikel_v" USING btree ("version__status");
  CREATE INDEX "_artikel_v_created_at_idx" ON "_artikel_v" USING btree ("created_at");
  CREATE INDEX "_artikel_v_updated_at_idx" ON "_artikel_v" USING btree ("updated_at");
  CREATE INDEX "_artikel_v_latest_idx" ON "_artikel_v" USING btree ("latest");
  CREATE INDEX "_artikel_v_autosave_idx" ON "_artikel_v" USING btree ("autosave");
  CREATE INDEX "_artikel_v_texts_order_parent" ON "_artikel_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_artikel_v_rels_order_idx" ON "_artikel_v_rels" USING btree ("order");
  CREATE INDEX "_artikel_v_rels_parent_idx" ON "_artikel_v_rels" USING btree ("parent_id");
  CREATE INDEX "_artikel_v_rels_path_idx" ON "_artikel_v_rels" USING btree ("path");
  CREATE INDEX "_artikel_v_rels_tools_id_idx" ON "_artikel_v_rels" USING btree ("tools_id");
  CREATE INDEX "_artikel_v_rels_artikel_id_idx" ON "_artikel_v_rels" USING btree ("artikel_id");
  CREATE INDEX "tools_bantuan_input_order_idx" ON "tools_bantuan_input" USING btree ("_order");
  CREATE INDEX "tools_bantuan_input_parent_id_idx" ON "tools_bantuan_input" USING btree ("_parent_id");
  CREATE INDEX "tools_faq_order_idx" ON "tools_faq" USING btree ("_order");
  CREATE INDEX "tools_faq_parent_id_idx" ON "tools_faq" USING btree ("_parent_id");
  CREATE INDEX "tools_sumber_aturan_order_idx" ON "tools_sumber_aturan" USING btree ("_order");
  CREATE INDEX "tools_sumber_aturan_parent_id_idx" ON "tools_sumber_aturan" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tools_slug_idx" ON "tools" USING btree ("slug");
  CREATE INDEX "tools_pilar_idx" ON "tools" USING btree ("pilar_id");
  CREATE UNIQUE INDEX "tools_tool_id_idx" ON "tools" USING btree ("tool_id");
  CREATE INDEX "tools_seo_seo_gambar_o_g_idx" ON "tools" USING btree ("seo_gambar_o_g_id");
  CREATE INDEX "tools_updated_at_idx" ON "tools" USING btree ("updated_at");
  CREATE INDEX "tools_created_at_idx" ON "tools" USING btree ("created_at");
  CREATE INDEX "tools__status_idx" ON "tools" USING btree ("_status");
  CREATE INDEX "tools_texts_order_parent" ON "tools_texts" USING btree ("order","parent_id");
  CREATE INDEX "_tools_v_version_bantuan_input_order_idx" ON "_tools_v_version_bantuan_input" USING btree ("_order");
  CREATE INDEX "_tools_v_version_bantuan_input_parent_id_idx" ON "_tools_v_version_bantuan_input" USING btree ("_parent_id");
  CREATE INDEX "_tools_v_version_faq_order_idx" ON "_tools_v_version_faq" USING btree ("_order");
  CREATE INDEX "_tools_v_version_faq_parent_id_idx" ON "_tools_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_tools_v_version_sumber_aturan_order_idx" ON "_tools_v_version_sumber_aturan" USING btree ("_order");
  CREATE INDEX "_tools_v_version_sumber_aturan_parent_id_idx" ON "_tools_v_version_sumber_aturan" USING btree ("_parent_id");
  CREATE INDEX "_tools_v_parent_idx" ON "_tools_v" USING btree ("parent_id");
  CREATE INDEX "_tools_v_version_version_slug_idx" ON "_tools_v" USING btree ("version_slug");
  CREATE INDEX "_tools_v_version_version_pilar_idx" ON "_tools_v" USING btree ("version_pilar_id");
  CREATE INDEX "_tools_v_version_version_tool_id_idx" ON "_tools_v" USING btree ("version_tool_id");
  CREATE INDEX "_tools_v_version_seo_version_seo_gambar_o_g_idx" ON "_tools_v" USING btree ("version_seo_gambar_o_g_id");
  CREATE INDEX "_tools_v_version_version_updated_at_idx" ON "_tools_v" USING btree ("version_updated_at");
  CREATE INDEX "_tools_v_version_version_created_at_idx" ON "_tools_v" USING btree ("version_created_at");
  CREATE INDEX "_tools_v_version_version__status_idx" ON "_tools_v" USING btree ("version__status");
  CREATE INDEX "_tools_v_created_at_idx" ON "_tools_v" USING btree ("created_at");
  CREATE INDEX "_tools_v_updated_at_idx" ON "_tools_v" USING btree ("updated_at");
  CREATE INDEX "_tools_v_latest_idx" ON "_tools_v" USING btree ("latest");
  CREATE INDEX "_tools_v_autosave_idx" ON "_tools_v" USING btree ("autosave");
  CREATE INDEX "_tools_v_texts_order_parent" ON "_tools_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "parameter_tools_tabel_order_idx" ON "parameter_tools_tabel" USING btree ("_order");
  CREATE INDEX "parameter_tools_tabel_parent_id_idx" ON "parameter_tools_tabel" USING btree ("_parent_id");
  CREATE INDEX "parameter_tools_updated_at_idx" ON "parameter_tools" USING btree ("updated_at");
  CREATE INDEX "parameter_tools_created_at_idx" ON "parameter_tools" USING btree ("created_at");
  CREATE UNIQUE INDEX "video_slug_idx" ON "video" USING btree ("slug");
  CREATE INDEX "video_file_idx" ON "video" USING btree ("file_id");
  CREATE INDEX "video_poster_idx" ON "video" USING btree ("poster_id");
  CREATE INDEX "video_pilar_idx" ON "video" USING btree ("pilar_id");
  CREATE INDEX "video_seo_seo_gambar_o_g_idx" ON "video" USING btree ("seo_gambar_o_g_id");
  CREATE INDEX "video_updated_at_idx" ON "video" USING btree ("updated_at");
  CREATE INDEX "video_created_at_idx" ON "video" USING btree ("created_at");
  CREATE INDEX "video__status_idx" ON "video" USING btree ("_status");
  CREATE INDEX "video_texts_order_parent" ON "video_texts" USING btree ("order","parent_id");
  CREATE INDEX "_video_v_parent_idx" ON "_video_v" USING btree ("parent_id");
  CREATE INDEX "_video_v_version_version_slug_idx" ON "_video_v" USING btree ("version_slug");
  CREATE INDEX "_video_v_version_version_file_idx" ON "_video_v" USING btree ("version_file_id");
  CREATE INDEX "_video_v_version_version_poster_idx" ON "_video_v" USING btree ("version_poster_id");
  CREATE INDEX "_video_v_version_version_pilar_idx" ON "_video_v" USING btree ("version_pilar_id");
  CREATE INDEX "_video_v_version_seo_version_seo_gambar_o_g_idx" ON "_video_v" USING btree ("version_seo_gambar_o_g_id");
  CREATE INDEX "_video_v_version_version_updated_at_idx" ON "_video_v" USING btree ("version_updated_at");
  CREATE INDEX "_video_v_version_version_created_at_idx" ON "_video_v" USING btree ("version_created_at");
  CREATE INDEX "_video_v_version_version__status_idx" ON "_video_v" USING btree ("version__status");
  CREATE INDEX "_video_v_created_at_idx" ON "_video_v" USING btree ("created_at");
  CREATE INDEX "_video_v_updated_at_idx" ON "_video_v" USING btree ("updated_at");
  CREATE INDEX "_video_v_latest_idx" ON "_video_v" USING btree ("latest");
  CREATE INDEX "_video_v_autosave_idx" ON "_video_v" USING btree ("autosave");
  CREATE INDEX "_video_v_texts_order_parent" ON "_video_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "halaman_blocks_hero_order_idx" ON "halaman_blocks_hero" USING btree ("_order");
  CREATE INDEX "halaman_blocks_hero_parent_id_idx" ON "halaman_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_hero_path_idx" ON "halaman_blocks_hero" USING btree ("_path");
  CREATE INDEX "halaman_blocks_hero_gambar_idx" ON "halaman_blocks_hero" USING btree ("gambar_id");
  CREATE INDEX "halaman_blocks_teks_order_idx" ON "halaman_blocks_teks" USING btree ("_order");
  CREATE INDEX "halaman_blocks_teks_parent_id_idx" ON "halaman_blocks_teks" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_teks_path_idx" ON "halaman_blocks_teks" USING btree ("_path");
  CREATE INDEX "halaman_blocks_kartu_kartu_order_idx" ON "halaman_blocks_kartu_kartu" USING btree ("_order");
  CREATE INDEX "halaman_blocks_kartu_kartu_parent_id_idx" ON "halaman_blocks_kartu_kartu" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_kartu_order_idx" ON "halaman_blocks_kartu" USING btree ("_order");
  CREATE INDEX "halaman_blocks_kartu_parent_id_idx" ON "halaman_blocks_kartu" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_kartu_path_idx" ON "halaman_blocks_kartu" USING btree ("_path");
  CREATE INDEX "halaman_blocks_cta_order_idx" ON "halaman_blocks_cta" USING btree ("_order");
  CREATE INDEX "halaman_blocks_cta_parent_id_idx" ON "halaman_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_cta_path_idx" ON "halaman_blocks_cta" USING btree ("_path");
  CREATE INDEX "halaman_blocks_faq_blok_faq_order_idx" ON "halaman_blocks_faq_blok_faq" USING btree ("_order");
  CREATE INDEX "halaman_blocks_faq_blok_faq_parent_id_idx" ON "halaman_blocks_faq_blok_faq" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_faq_blok_order_idx" ON "halaman_blocks_faq_blok" USING btree ("_order");
  CREATE INDEX "halaman_blocks_faq_blok_parent_id_idx" ON "halaman_blocks_faq_blok" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_faq_blok_path_idx" ON "halaman_blocks_faq_blok" USING btree ("_path");
  CREATE INDEX "halaman_blocks_embed_tool_order_idx" ON "halaman_blocks_embed_tool" USING btree ("_order");
  CREATE INDEX "halaman_blocks_embed_tool_parent_id_idx" ON "halaman_blocks_embed_tool" USING btree ("_parent_id");
  CREATE INDEX "halaman_blocks_embed_tool_path_idx" ON "halaman_blocks_embed_tool" USING btree ("_path");
  CREATE INDEX "halaman_blocks_embed_tool_tool_idx" ON "halaman_blocks_embed_tool" USING btree ("tool_id");
  CREATE UNIQUE INDEX "halaman_slug_idx" ON "halaman" USING btree ("slug");
  CREATE INDEX "halaman_seo_seo_gambar_o_g_idx" ON "halaman" USING btree ("seo_gambar_o_g_id");
  CREATE INDEX "halaman_updated_at_idx" ON "halaman" USING btree ("updated_at");
  CREATE INDEX "halaman_created_at_idx" ON "halaman" USING btree ("created_at");
  CREATE INDEX "halaman__status_idx" ON "halaman" USING btree ("_status");
  CREATE INDEX "halaman_texts_order_parent" ON "halaman_texts" USING btree ("order","parent_id");
  CREATE INDEX "_halaman_v_blocks_hero_order_idx" ON "_halaman_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_hero_parent_id_idx" ON "_halaman_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_hero_path_idx" ON "_halaman_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_hero_gambar_idx" ON "_halaman_v_blocks_hero" USING btree ("gambar_id");
  CREATE INDEX "_halaman_v_blocks_teks_order_idx" ON "_halaman_v_blocks_teks" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_teks_parent_id_idx" ON "_halaman_v_blocks_teks" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_teks_path_idx" ON "_halaman_v_blocks_teks" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_kartu_kartu_order_idx" ON "_halaman_v_blocks_kartu_kartu" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_kartu_kartu_parent_id_idx" ON "_halaman_v_blocks_kartu_kartu" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_kartu_order_idx" ON "_halaman_v_blocks_kartu" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_kartu_parent_id_idx" ON "_halaman_v_blocks_kartu" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_kartu_path_idx" ON "_halaman_v_blocks_kartu" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_cta_order_idx" ON "_halaman_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_cta_parent_id_idx" ON "_halaman_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_cta_path_idx" ON "_halaman_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_faq_blok_faq_order_idx" ON "_halaman_v_blocks_faq_blok_faq" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_faq_blok_faq_parent_id_idx" ON "_halaman_v_blocks_faq_blok_faq" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_faq_blok_order_idx" ON "_halaman_v_blocks_faq_blok" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_faq_blok_parent_id_idx" ON "_halaman_v_blocks_faq_blok" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_faq_blok_path_idx" ON "_halaman_v_blocks_faq_blok" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_embed_tool_order_idx" ON "_halaman_v_blocks_embed_tool" USING btree ("_order");
  CREATE INDEX "_halaman_v_blocks_embed_tool_parent_id_idx" ON "_halaman_v_blocks_embed_tool" USING btree ("_parent_id");
  CREATE INDEX "_halaman_v_blocks_embed_tool_path_idx" ON "_halaman_v_blocks_embed_tool" USING btree ("_path");
  CREATE INDEX "_halaman_v_blocks_embed_tool_tool_idx" ON "_halaman_v_blocks_embed_tool" USING btree ("tool_id");
  CREATE INDEX "_halaman_v_parent_idx" ON "_halaman_v" USING btree ("parent_id");
  CREATE INDEX "_halaman_v_version_version_slug_idx" ON "_halaman_v" USING btree ("version_slug");
  CREATE INDEX "_halaman_v_version_seo_version_seo_gambar_o_g_idx" ON "_halaman_v" USING btree ("version_seo_gambar_o_g_id");
  CREATE INDEX "_halaman_v_version_version_updated_at_idx" ON "_halaman_v" USING btree ("version_updated_at");
  CREATE INDEX "_halaman_v_version_version_created_at_idx" ON "_halaman_v" USING btree ("version_created_at");
  CREATE INDEX "_halaman_v_version_version__status_idx" ON "_halaman_v" USING btree ("version__status");
  CREATE INDEX "_halaman_v_created_at_idx" ON "_halaman_v" USING btree ("created_at");
  CREATE INDEX "_halaman_v_updated_at_idx" ON "_halaman_v" USING btree ("updated_at");
  CREATE INDEX "_halaman_v_latest_idx" ON "_halaman_v" USING btree ("latest");
  CREATE INDEX "_halaman_v_autosave_idx" ON "_halaman_v" USING btree ("autosave");
  CREATE INDEX "_halaman_v_texts_order_parent" ON "_halaman_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "redirect_dari_idx" ON "redirect" USING btree ("dari");
  CREATE INDEX "redirect_updated_at_idx" ON "redirect" USING btree ("updated_at");
  CREATE INDEX "redirect_created_at_idx" ON "redirect" USING btree ("created_at");
  CREATE UNIQUE INDEX "log_404_path_idx" ON "log_404" USING btree ("path");
  CREATE INDEX "log_404_updated_at_idx" ON "log_404" USING btree ("updated_at");
  CREATE INDEX "log_404_created_at_idx" ON "log_404" USING btree ("created_at");
  CREATE UNIQUE INDEX "antrean_indexing_kunci_idx" ON "antrean_indexing" USING btree ("kunci");
  CREATE INDEX "antrean_indexing_jadwal_idx" ON "antrean_indexing" USING btree ("jadwal");
  CREATE INDEX "antrean_indexing_updated_at_idx" ON "antrean_indexing" USING btree ("updated_at");
  CREATE INDEX "antrean_indexing_created_at_idx" ON "antrean_indexing" USING btree ("created_at");
  CREATE INDEX "log_indexing_waktu_idx" ON "log_indexing" USING btree ("waktu");
  CREATE INDEX "log_indexing_url_idx" ON "log_indexing" USING btree ("url");
  CREATE INDEX "log_indexing_langkah_idx" ON "log_indexing" USING btree ("langkah");
  CREATE INDEX "log_indexing_status_idx" ON "log_indexing" USING btree ("status");
  CREATE INDEX "log_indexing_updated_at_idx" ON "log_indexing" USING btree ("updated_at");
  CREATE INDEX "log_indexing_created_at_idx" ON "log_indexing" USING btree ("created_at");
  CREATE UNIQUE INDEX "status_indeks_path_idx" ON "status_indeks" USING btree ("path");
  CREATE INDEX "status_indeks_status_idx" ON "status_indeks" USING btree ("status");
  CREATE INDEX "status_indeks_updated_at_idx" ON "status_indeks" USING btree ("updated_at");
  CREATE INDEX "status_indeks_created_at_idx" ON "status_indeks" USING btree ("created_at");
  CREATE UNIQUE INDEX "analitik_halaman_path_idx" ON "analitik_halaman" USING btree ("path");
  CREATE INDEX "analitik_halaman_klik28_idx" ON "analitik_halaman" USING btree ("klik28");
  CREATE INDEX "analitik_halaman_klik7_idx" ON "analitik_halaman" USING btree ("klik7");
  CREATE INDEX "analitik_halaman_updated_at_idx" ON "analitik_halaman" USING btree ("updated_at");
  CREATE INDEX "analitik_halaman_created_at_idx" ON "analitik_halaman" USING btree ("created_at");
  CREATE UNIQUE INDEX "analitik_situs_tanggal_idx" ON "analitik_situs" USING btree ("tanggal");
  CREATE INDEX "analitik_situs_updated_at_idx" ON "analitik_situs" USING btree ("updated_at");
  CREATE INDEX "analitik_situs_created_at_idx" ON "analitik_situs" USING btree ("created_at");
  CREATE UNIQUE INDEX "tugas_seo_jenis_idx" ON "tugas_seo" USING btree ("jenis");
  CREATE INDEX "tugas_seo_berikutnya_idx" ON "tugas_seo" USING btree ("berikutnya");
  CREATE INDEX "tugas_seo_updated_at_idx" ON "tugas_seo" USING btree ("updated_at");
  CREATE INDEX "tugas_seo_created_at_idx" ON "tugas_seo" USING btree ("created_at");
  CREATE INDEX "temuan_tautan_jenis_idx" ON "temuan_tautan" USING btree ("jenis");
  CREATE INDEX "temuan_tautan_updated_at_idx" ON "temuan_tautan" USING btree ("updated_at");
  CREATE INDEX "temuan_tautan_created_at_idx" ON "temuan_tautan" USING btree ("created_at");
  CREATE UNIQUE INDEX "tautan_luar_url_idx" ON "tautan_luar" USING btree ("url");
  CREATE INDEX "tautan_luar_status_idx" ON "tautan_luar" USING btree ("status");
  CREATE INDEX "tautan_luar_berikutnya_idx" ON "tautan_luar" USING btree ("berikutnya");
  CREATE INDEX "tautan_luar_updated_at_idx" ON "tautan_luar" USING btree ("updated_at");
  CREATE INDEX "tautan_luar_created_at_idx" ON "tautan_luar" USING btree ("created_at");
  CREATE INDEX "log_ai_waktu_idx" ON "log_ai" USING btree ("waktu");
  CREATE INDEX "log_ai_status_idx" ON "log_ai" USING btree ("status");
  CREATE INDEX "log_ai_pengguna_idx" ON "log_ai" USING btree ("pengguna_id");
  CREATE INDEX "log_ai_dokumen_idx" ON "log_ai" USING btree ("dokumen_id");
  CREATE INDEX "log_ai_updated_at_idx" ON "log_ai" USING btree ("updated_at");
  CREATE INDEX "log_ai_created_at_idx" ON "log_ai" USING btree ("created_at");
  CREATE UNIQUE INDEX "pemakaian_ai_bulan_idx" ON "pemakaian_ai" USING btree ("bulan");
  CREATE INDEX "pemakaian_ai_updated_at_idx" ON "pemakaian_ai" USING btree ("updated_at");
  CREATE INDEX "pemakaian_ai_created_at_idx" ON "pemakaian_ai" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pengguna_id_idx" ON "payload_locked_documents_rels" USING btree ("pengguna_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pilar_id_idx" ON "payload_locked_documents_rels" USING btree ("pilar_id");
  CREATE INDEX "payload_locked_documents_rels_subkategori_id_idx" ON "payload_locked_documents_rels" USING btree ("subkategori_id");
  CREATE INDEX "payload_locked_documents_rels_penulis_id_idx" ON "payload_locked_documents_rels" USING btree ("penulis_id");
  CREATE INDEX "payload_locked_documents_rels_artikel_id_idx" ON "payload_locked_documents_rels" USING btree ("artikel_id");
  CREATE INDEX "payload_locked_documents_rels_tools_id_idx" ON "payload_locked_documents_rels" USING btree ("tools_id");
  CREATE INDEX "payload_locked_documents_rels_parameter_tools_id_idx" ON "payload_locked_documents_rels" USING btree ("parameter_tools_id");
  CREATE INDEX "payload_locked_documents_rels_video_id_idx" ON "payload_locked_documents_rels" USING btree ("video_id");
  CREATE INDEX "payload_locked_documents_rels_halaman_id_idx" ON "payload_locked_documents_rels" USING btree ("halaman_id");
  CREATE INDEX "payload_locked_documents_rels_redirect_id_idx" ON "payload_locked_documents_rels" USING btree ("redirect_id");
  CREATE INDEX "payload_locked_documents_rels_log_404_id_idx" ON "payload_locked_documents_rels" USING btree ("log_404_id");
  CREATE INDEX "payload_locked_documents_rels_antrean_indexing_id_idx" ON "payload_locked_documents_rels" USING btree ("antrean_indexing_id");
  CREATE INDEX "payload_locked_documents_rels_log_indexing_id_idx" ON "payload_locked_documents_rels" USING btree ("log_indexing_id");
  CREATE INDEX "payload_locked_documents_rels_status_indeks_id_idx" ON "payload_locked_documents_rels" USING btree ("status_indeks_id");
  CREATE INDEX "payload_locked_documents_rels_analitik_halaman_id_idx" ON "payload_locked_documents_rels" USING btree ("analitik_halaman_id");
  CREATE INDEX "payload_locked_documents_rels_analitik_situs_id_idx" ON "payload_locked_documents_rels" USING btree ("analitik_situs_id");
  CREATE INDEX "payload_locked_documents_rels_tugas_seo_id_idx" ON "payload_locked_documents_rels" USING btree ("tugas_seo_id");
  CREATE INDEX "payload_locked_documents_rels_temuan_tautan_id_idx" ON "payload_locked_documents_rels" USING btree ("temuan_tautan_id");
  CREATE INDEX "payload_locked_documents_rels_tautan_luar_id_idx" ON "payload_locked_documents_rels" USING btree ("tautan_luar_id");
  CREATE INDEX "payload_locked_documents_rels_log_ai_id_idx" ON "payload_locked_documents_rels" USING btree ("log_ai_id");
  CREATE INDEX "payload_locked_documents_rels_pemakaian_ai_id_idx" ON "payload_locked_documents_rels" USING btree ("pemakaian_ai_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_pengguna_id_idx" ON "payload_preferences_rels" USING btree ("pengguna_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "header_menu_order_idx" ON "header_menu" USING btree ("_order");
  CREATE INDEX "header_menu_parent_id_idx" ON "header_menu" USING btree ("_parent_id");
  CREATE INDEX "header_menu_pilar_idx" ON "header_menu" USING btree ("pilar_id");
  CREATE INDEX "footer_tautan_order_idx" ON "footer_tautan" USING btree ("_order");
  CREATE INDEX "footer_tautan_parent_id_idx" ON "footer_tautan" USING btree ("_parent_id");
  CREATE INDEX "footer_sosial_order_idx" ON "footer_sosial" USING btree ("_order");
  CREATE INDEX "footer_sosial_parent_id_idx" ON "footer_sosial" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_hero_beranda_order_idx" ON "beranda_blocks_hero_beranda" USING btree ("_order");
  CREATE INDEX "beranda_blocks_hero_beranda_parent_id_idx" ON "beranda_blocks_hero_beranda" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_hero_beranda_path_idx" ON "beranda_blocks_hero_beranda" USING btree ("_path");
  CREATE INDEX "beranda_blocks_mozaik_pilihan_order_idx" ON "beranda_blocks_mozaik_pilihan" USING btree ("_order");
  CREATE INDEX "beranda_blocks_mozaik_pilihan_parent_id_idx" ON "beranda_blocks_mozaik_pilihan" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_mozaik_pilihan_path_idx" ON "beranda_blocks_mozaik_pilihan" USING btree ("_path");
  CREATE INDEX "beranda_blocks_strip_video_order_idx" ON "beranda_blocks_strip_video" USING btree ("_order");
  CREATE INDEX "beranda_blocks_strip_video_parent_id_idx" ON "beranda_blocks_strip_video" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_strip_video_path_idx" ON "beranda_blocks_strip_video" USING btree ("_path");
  CREATE INDEX "beranda_blocks_paling_dibaca_order_idx" ON "beranda_blocks_paling_dibaca" USING btree ("_order");
  CREATE INDEX "beranda_blocks_paling_dibaca_parent_id_idx" ON "beranda_blocks_paling_dibaca" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_paling_dibaca_path_idx" ON "beranda_blocks_paling_dibaca" USING btree ("_path");
  CREATE INDEX "beranda_blocks_newsletter_blok_order_idx" ON "beranda_blocks_newsletter_blok" USING btree ("_order");
  CREATE INDEX "beranda_blocks_newsletter_blok_parent_id_idx" ON "beranda_blocks_newsletter_blok" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_newsletter_blok_path_idx" ON "beranda_blocks_newsletter_blok" USING btree ("_path");
  CREATE INDEX "beranda_blocks_slot_iklan_order_idx" ON "beranda_blocks_slot_iklan" USING btree ("_order");
  CREATE INDEX "beranda_blocks_slot_iklan_parent_id_idx" ON "beranda_blocks_slot_iklan" USING btree ("_parent_id");
  CREATE INDEX "beranda_blocks_slot_iklan_path_idx" ON "beranda_blocks_slot_iklan" USING btree ("_path");
  CREATE INDEX "beranda__status_idx" ON "beranda" USING btree ("_status");
  CREATE INDEX "beranda_rels_order_idx" ON "beranda_rels" USING btree ("order");
  CREATE INDEX "beranda_rels_parent_idx" ON "beranda_rels" USING btree ("parent_id");
  CREATE INDEX "beranda_rels_path_idx" ON "beranda_rels" USING btree ("path");
  CREATE INDEX "beranda_rels_artikel_id_idx" ON "beranda_rels" USING btree ("artikel_id");
  CREATE INDEX "beranda_rels_video_id_idx" ON "beranda_rels" USING btree ("video_id");
  CREATE INDEX "_beranda_v_blocks_hero_beranda_order_idx" ON "_beranda_v_blocks_hero_beranda" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_hero_beranda_parent_id_idx" ON "_beranda_v_blocks_hero_beranda" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_hero_beranda_path_idx" ON "_beranda_v_blocks_hero_beranda" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_mozaik_pilihan_order_idx" ON "_beranda_v_blocks_mozaik_pilihan" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_mozaik_pilihan_parent_id_idx" ON "_beranda_v_blocks_mozaik_pilihan" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_mozaik_pilihan_path_idx" ON "_beranda_v_blocks_mozaik_pilihan" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_strip_video_order_idx" ON "_beranda_v_blocks_strip_video" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_strip_video_parent_id_idx" ON "_beranda_v_blocks_strip_video" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_strip_video_path_idx" ON "_beranda_v_blocks_strip_video" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_paling_dibaca_order_idx" ON "_beranda_v_blocks_paling_dibaca" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_paling_dibaca_parent_id_idx" ON "_beranda_v_blocks_paling_dibaca" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_paling_dibaca_path_idx" ON "_beranda_v_blocks_paling_dibaca" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_newsletter_blok_order_idx" ON "_beranda_v_blocks_newsletter_blok" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_newsletter_blok_parent_id_idx" ON "_beranda_v_blocks_newsletter_blok" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_newsletter_blok_path_idx" ON "_beranda_v_blocks_newsletter_blok" USING btree ("_path");
  CREATE INDEX "_beranda_v_blocks_slot_iklan_order_idx" ON "_beranda_v_blocks_slot_iklan" USING btree ("_order");
  CREATE INDEX "_beranda_v_blocks_slot_iklan_parent_id_idx" ON "_beranda_v_blocks_slot_iklan" USING btree ("_parent_id");
  CREATE INDEX "_beranda_v_blocks_slot_iklan_path_idx" ON "_beranda_v_blocks_slot_iklan" USING btree ("_path");
  CREATE INDEX "_beranda_v_version_version__status_idx" ON "_beranda_v" USING btree ("version__status");
  CREATE INDEX "_beranda_v_created_at_idx" ON "_beranda_v" USING btree ("created_at");
  CREATE INDEX "_beranda_v_updated_at_idx" ON "_beranda_v" USING btree ("updated_at");
  CREATE INDEX "_beranda_v_latest_idx" ON "_beranda_v" USING btree ("latest");
  CREATE INDEX "_beranda_v_rels_order_idx" ON "_beranda_v_rels" USING btree ("order");
  CREATE INDEX "_beranda_v_rels_parent_idx" ON "_beranda_v_rels" USING btree ("parent_id");
  CREATE INDEX "_beranda_v_rels_path_idx" ON "_beranda_v_rels" USING btree ("path");
  CREATE INDEX "_beranda_v_rels_artikel_id_idx" ON "_beranda_v_rels" USING btree ("artikel_id");
  CREATE INDEX "_beranda_v_rels_video_id_idx" ON "_beranda_v_rels" USING btree ("video_id");
  CREATE INDEX "pengaturan_seo_gambar_og_default_idx" ON "pengaturan_seo" USING btree ("gambar_og_default_id");
  CREATE INDEX "pengaturan_seo_organisasi_organisasi_logo_idx" ON "pengaturan_seo" USING btree ("organisasi_logo_id");
  CREATE INDEX "pengaturan_seo_texts_order_parent" ON "pengaturan_seo_texts" USING btree ("order","parent_id");
  CREATE INDEX "asisten_ai_harga_order_idx" ON "asisten_ai_harga" USING btree ("_order");
  CREATE INDEX "asisten_ai_harga_parent_id_idx" ON "asisten_ai_harga" USING btree ("_parent_id");
  CREATE INDEX "asisten_ai_sumber_resmi_order_idx" ON "asisten_ai_sumber_resmi" USING btree ("_order");
  CREATE INDEX "asisten_ai_sumber_resmi_parent_id_idx" ON "asisten_ai_sumber_resmi" USING btree ("_parent_id");
  CREATE INDEX "asisten_ai_sumber_resmi_pilar_idx" ON "asisten_ai_sumber_resmi" USING btree ("pilar_id");
  CREATE INDEX "asisten_ai_texts_order_parent" ON "asisten_ai_texts" USING btree ("order","parent_id");
  CREATE INDEX "iklan_slot_order_idx" ON "iklan_slot" USING btree ("_order");
  CREATE INDEX "iklan_slot_parent_id_idx" ON "iklan_slot" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pengguna_sessions" CASCADE;
  DROP TABLE "pengguna" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "pilar" CASCADE;
  DROP TABLE "pilar_texts" CASCADE;
  DROP TABLE "subkategori" CASCADE;
  DROP TABLE "subkategori_texts" CASCADE;
  DROP TABLE "penulis_tautan" CASCADE;
  DROP TABLE "penulis" CASCADE;
  DROP TABLE "penulis_texts" CASCADE;
  DROP TABLE "artikel_intinya" CASCADE;
  DROP TABLE "artikel_faq" CASCADE;
  DROP TABLE "artikel_sumber" CASCADE;
  DROP TABLE "artikel" CASCADE;
  DROP TABLE "artikel_texts" CASCADE;
  DROP TABLE "artikel_rels" CASCADE;
  DROP TABLE "_artikel_v_version_intinya" CASCADE;
  DROP TABLE "_artikel_v_version_faq" CASCADE;
  DROP TABLE "_artikel_v_version_sumber" CASCADE;
  DROP TABLE "_artikel_v" CASCADE;
  DROP TABLE "_artikel_v_texts" CASCADE;
  DROP TABLE "_artikel_v_rels" CASCADE;
  DROP TABLE "tools_bantuan_input" CASCADE;
  DROP TABLE "tools_faq" CASCADE;
  DROP TABLE "tools_sumber_aturan" CASCADE;
  DROP TABLE "tools" CASCADE;
  DROP TABLE "tools_texts" CASCADE;
  DROP TABLE "_tools_v_version_bantuan_input" CASCADE;
  DROP TABLE "_tools_v_version_faq" CASCADE;
  DROP TABLE "_tools_v_version_sumber_aturan" CASCADE;
  DROP TABLE "_tools_v" CASCADE;
  DROP TABLE "_tools_v_texts" CASCADE;
  DROP TABLE "parameter_tools_tabel" CASCADE;
  DROP TABLE "parameter_tools" CASCADE;
  DROP TABLE "video" CASCADE;
  DROP TABLE "video_texts" CASCADE;
  DROP TABLE "_video_v" CASCADE;
  DROP TABLE "_video_v_texts" CASCADE;
  DROP TABLE "halaman_blocks_hero" CASCADE;
  DROP TABLE "halaman_blocks_teks" CASCADE;
  DROP TABLE "halaman_blocks_kartu_kartu" CASCADE;
  DROP TABLE "halaman_blocks_kartu" CASCADE;
  DROP TABLE "halaman_blocks_cta" CASCADE;
  DROP TABLE "halaman_blocks_faq_blok_faq" CASCADE;
  DROP TABLE "halaman_blocks_faq_blok" CASCADE;
  DROP TABLE "halaman_blocks_embed_tool" CASCADE;
  DROP TABLE "halaman" CASCADE;
  DROP TABLE "halaman_texts" CASCADE;
  DROP TABLE "_halaman_v_blocks_hero" CASCADE;
  DROP TABLE "_halaman_v_blocks_teks" CASCADE;
  DROP TABLE "_halaman_v_blocks_kartu_kartu" CASCADE;
  DROP TABLE "_halaman_v_blocks_kartu" CASCADE;
  DROP TABLE "_halaman_v_blocks_cta" CASCADE;
  DROP TABLE "_halaman_v_blocks_faq_blok_faq" CASCADE;
  DROP TABLE "_halaman_v_blocks_faq_blok" CASCADE;
  DROP TABLE "_halaman_v_blocks_embed_tool" CASCADE;
  DROP TABLE "_halaman_v" CASCADE;
  DROP TABLE "_halaman_v_texts" CASCADE;
  DROP TABLE "redirect" CASCADE;
  DROP TABLE "log_404" CASCADE;
  DROP TABLE "antrean_indexing" CASCADE;
  DROP TABLE "log_indexing" CASCADE;
  DROP TABLE "status_indeks" CASCADE;
  DROP TABLE "analitik_halaman" CASCADE;
  DROP TABLE "analitik_situs" CASCADE;
  DROP TABLE "tugas_seo" CASCADE;
  DROP TABLE "temuan_tautan" CASCADE;
  DROP TABLE "tautan_luar" CASCADE;
  DROP TABLE "log_ai" CASCADE;
  DROP TABLE "pemakaian_ai" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "header_menu" CASCADE;
  DROP TABLE "header" CASCADE;
  DROP TABLE "footer_tautan" CASCADE;
  DROP TABLE "footer_sosial" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "beranda_blocks_hero_beranda" CASCADE;
  DROP TABLE "beranda_blocks_mozaik_pilihan" CASCADE;
  DROP TABLE "beranda_blocks_strip_video" CASCADE;
  DROP TABLE "beranda_blocks_paling_dibaca" CASCADE;
  DROP TABLE "beranda_blocks_newsletter_blok" CASCADE;
  DROP TABLE "beranda_blocks_slot_iklan" CASCADE;
  DROP TABLE "beranda" CASCADE;
  DROP TABLE "beranda_rels" CASCADE;
  DROP TABLE "_beranda_v_blocks_hero_beranda" CASCADE;
  DROP TABLE "_beranda_v_blocks_mozaik_pilihan" CASCADE;
  DROP TABLE "_beranda_v_blocks_strip_video" CASCADE;
  DROP TABLE "_beranda_v_blocks_paling_dibaca" CASCADE;
  DROP TABLE "_beranda_v_blocks_newsletter_blok" CASCADE;
  DROP TABLE "_beranda_v_blocks_slot_iklan" CASCADE;
  DROP TABLE "_beranda_v" CASCADE;
  DROP TABLE "_beranda_v_rels" CASCADE;
  DROP TABLE "pengaturan_seo" CASCADE;
  DROP TABLE "pengaturan_seo_texts" CASCADE;
  DROP TABLE "newsletter" CASCADE;
  DROP TABLE "asisten_ai_harga" CASCADE;
  DROP TABLE "asisten_ai_sumber_resmi" CASCADE;
  DROP TABLE "asisten_ai" CASCADE;
  DROP TABLE "asisten_ai_texts" CASCADE;
  DROP TABLE "iklan_slot" CASCADE;
  DROP TABLE "iklan" CASCADE;
  DROP TYPE "public"."enum_pengguna_peran";
  DROP TYPE "public"."enum_media_jenis";
  DROP TYPE "public"."enum_pilar_warna";
  DROP TYPE "public"."enum_pilar_seo_tipe_schema";
  DROP TYPE "public"."enum_subkategori_seo_tipe_schema";
  DROP TYPE "public"."enum_penulis_seo_tipe_schema";
  DROP TYPE "public"."enum_artikel_seo_tipe_schema";
  DROP TYPE "public"."enum_artikel_tipe";
  DROP TYPE "public"."enum_artikel_status";
  DROP TYPE "public"."enum__artikel_v_version_seo_tipe_schema";
  DROP TYPE "public"."enum__artikel_v_version_tipe";
  DROP TYPE "public"."enum__artikel_v_version_status";
  DROP TYPE "public"."enum_tools_tool_id";
  DROP TYPE "public"."enum_tools_seo_tipe_schema";
  DROP TYPE "public"."enum_tools_status";
  DROP TYPE "public"."enum__tools_v_version_tool_id";
  DROP TYPE "public"."enum__tools_v_version_seo_tipe_schema";
  DROP TYPE "public"."enum__tools_v_version_status";
  DROP TYPE "public"."enum_parameter_tools_tool_id";
  DROP TYPE "public"."enum_video_seo_tipe_schema";
  DROP TYPE "public"."enum_video_status";
  DROP TYPE "public"."enum__video_v_version_seo_tipe_schema";
  DROP TYPE "public"."enum__video_v_version_status";
  DROP TYPE "public"."enum_halaman_seo_tipe_schema";
  DROP TYPE "public"."enum_halaman_status";
  DROP TYPE "public"."enum__halaman_v_version_seo_tipe_schema";
  DROP TYPE "public"."enum__halaman_v_version_status";
  DROP TYPE "public"."enum_redirect_kode";
  DROP TYPE "public"."enum_redirect_sumber";
  DROP TYPE "public"."enum_antrean_indexing_langkah";
  DROP TYPE "public"."enum_antrean_indexing_jenis";
  DROP TYPE "public"."enum_log_indexing_jenis";
  DROP TYPE "public"."enum_log_indexing_langkah";
  DROP TYPE "public"."enum_log_indexing_adapter";
  DROP TYPE "public"."enum_log_indexing_status";
  DROP TYPE "public"."enum_status_indeks_status";
  DROP TYPE "public"."enum_tugas_seo_jenis";
  DROP TYPE "public"."enum_tugas_seo_status";
  DROP TYPE "public"."enum_temuan_tautan_jenis";
  DROP TYPE "public"."enum_tautan_luar_status";
  DROP TYPE "public"."enum_log_ai_tugas";
  DROP TYPE "public"."enum_log_ai_status";
  DROP TYPE "public"."enum_log_ai_mode";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_header_menu_jenis";
  DROP TYPE "public"."enum_footer_sosial_platform";
  DROP TYPE "public"."enum_beranda_status";
  DROP TYPE "public"."enum__beranda_v_version_status";
  DROP TYPE "public"."enum_newsletter_penyedia";
  DROP TYPE "public"."enum_iklan_slot_posisi";
  DROP TYPE "public"."enum_iklan_slot_ukuran";
  DROP TYPE "public"."enum_iklan_penyedia";`)
}
