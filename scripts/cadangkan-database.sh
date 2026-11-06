#!/usr/bin/env bash
# Cadangan database point.lat: pg_dump skema public (format custom), daftar isinya diperiksa pg_restore, lalu
# dienkripsi ke kunci publik GPG pemilik. Kunci rahasia untuk membukanya tidak pernah ada di GitHub.
# Dipakai workflow "Backup mingguan" (.github/workflows/backup.yml) dan bisa dijalankan manual.
#
# Pemakaian: scripts/cadangkan-database.sh <folder-keluaran>
#   BACKUP_DATABASE_URL  koneksi session pooler Supabase (port 5432; pg_dump butuh sesi utuh, mode transaksi tidak cukup)
#   BACKUP_KUNCI_PUBLIK  kunci publik GPG pemilik (teks berzirah ASCII)
#   PG_BIN               opsional: folder pg_dump, pg_restore, dan psql dengan versi sama atau lebih baru dari server
set -euo pipefail

folder=${1:?Pemakaian: scripts/cadangkan-database.sh <folder-keluaran>}
: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL belum diisi}"
: "${BACKUP_KUNCI_PUBLIK:?BACKUP_KUNCI_PUBLIK belum diisi}"
bin=${PG_BIN:+$PG_BIN/}

umask 077
mkdir -p "$folder"
kerja=$(mktemp -d)
trap 'rm -rf "$kerja"' EXIT

server=$("${bin}psql" "$BACKUP_DATABASE_URL" -XtAc 'show server_version_num')
klien=$("${bin}pg_dump" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')
if (( server / 10000 > klien )); then
  echo "pg_dump $klien lebih lama dari server Postgres $(( server / 10000 )). Pasang klien versi server dan isi PG_BIN." >&2
  exit 1
fi

nama="pointlat-$(date -u +%Y%m%dT%H%M%SZ)"
"${bin}pg_dump" --dbname="$BACKUP_DATABASE_URL" --schema=public --no-owner --no-privileges --format=custom --file="$kerja/$nama.dump"
tabel=$("${bin}pg_restore" --list "$kerja/$nama.dump" | grep -c ' TABLE DATA ' || true)
if (( tabel == 0 )); then
  echo "Cadangan tidak berisi data tabel. Periksa BACKUP_DATABASE_URL (database dan hak baca role)." >&2
  exit 1
fi

export GNUPGHOME="$kerja/gnupg"
mkdir -m 700 "$GNUPGHOME"
printf '%s\n' "$BACKUP_KUNCI_PUBLIK" > "$kerja/kunci-publik.asc"
gpg --batch --quiet --trust-model always --recipient-file "$kerja/kunci-publik.asc" \
  --output "$folder/$nama.dump.gpg" --encrypt "$kerja/$nama.dump"
(cd "$folder" && sha256sum "$nama.dump.gpg" > "$nama.dump.gpg.sha256")
echo "Cadangan $folder/$nama.dump.gpg: data $tabel tabel, $(stat -c %s "$folder/$nama.dump.gpg") byte terenkripsi."
