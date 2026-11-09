#!/usr/bin/env bash
# Postgres untuk tes otomatis tanpa Docker (keputusan pemilik 2026-11-09): menyalakan PostgreSQL bawaan image
# runner GitHub ubuntu-24.04 (layanannya mati secara bawaan), memberi user `postgres` password `postgres`, dan
# membuat database tes `pointlat_test` sesuai `.env.test`. Database lain (`pointlat_ci`, `pointlat_test_e2e`)
# dibuat Payload atau `tests/e2e/siapkan.ts` saat dibutuhkan. Hanya untuk CI: nilai ini bukan rahasia dan
# database-nya hilang bersama runner.
set -euo pipefail

sudo systemctl start postgresql.service

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 -q; then break; fi
  sleep 1
done
pg_isready -h 127.0.0.1 -p 5432

cd /tmp
sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q \
  -c "alter user postgres password 'postgres'" \
  -c "create database pointlat_test"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d pointlat_test -X -tAc \
  "select 'Postgres CI siap: ' || version() || ', zona waktu ' || current_setting('TimeZone')"
