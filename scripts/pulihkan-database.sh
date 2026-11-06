#!/usr/bin/env bash
# Memulihkan cadangan dari scripts/cadangkan-database.sh ke database kosong (lokal untuk uji pulih, atau proyek
# Supabase baru). Kunci rahasia GPG pemilik harus sudah diimpor (gpg --import) di komputer ini; gpg meminta
# passphrase-nya bila ada.
#
# Pemakaian: scripts/pulihkan-database.sh <cadangan.dump.gpg> <URL database tujuan yang kosong>
#   PG_BIN  opsional: folder pg_restore dan psql dengan versi sama atau lebih baru dari pg_dump pembuat cadangan
set -euo pipefail

cadangan=${1:?Pemakaian: scripts/pulihkan-database.sh <cadangan.dump.gpg> <URL database tujuan>}
tujuan=${2:?Pemakaian: scripts/pulihkan-database.sh <cadangan.dump.gpg> <URL database tujuan>}
bin=${PG_BIN:+$PG_BIN/}

if [ -f "$cadangan.sha256" ]; then
  (cd "$(dirname "$cadangan")" && sha256sum --check --quiet "$(basename "$cadangan").sha256")
fi

umask 077
kerja=$(mktemp -d)
trap 'rm -rf "$kerja"' EXIT
gpg --quiet --output "$kerja/cadangan.dump" --decrypt "$cadangan"

ada=$("${bin}psql" "$tujuan" -XtAc "select count(*) from information_schema.tables where table_schema = 'public'")
if [ "$ada" != 0 ]; then
  echo "Database tujuan sudah berisi $ada tabel di skema public. Pulihkan ke database kosong." >&2
  exit 1
fi

# Skema public sudah ada di database baru (Postgres dan Supabase), jadi entri pembuatnya dilewati.
"${bin}pg_restore" --list "$kerja/cadangan.dump" | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$kerja/daftar"
"${bin}pg_restore" --use-list="$kerja/daftar" --dbname="$tujuan" --no-owner --no-privileges --exit-on-error --single-transaction \
  "$kerja/cadangan.dump"

tabel=$("${bin}psql" "$tujuan" -XtAc "select count(*) from information_schema.tables where table_schema = 'public'")
migrasi=$("${bin}psql" "$tujuan" -XtAc "select coalesce(string_agg(name, ', ' order by name), '-') from payload_migrations where batch > 0")
echo "Dipulihkan: $tabel tabel. Migrasi tercatat: $migrasi."
