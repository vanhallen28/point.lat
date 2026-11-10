import * as migration_20261106_152942_awal from './20261106_152942_awal'
import * as migration_20261106_163351_kunci_data_api from './20261106_163351_kunci_data_api'
import * as migration_20261109_152615_ruang_redaksi from './20261109_152615_ruang_redaksi'
import * as migration_20261109_202605_beranda_portal from './20261109_202605_beranda_portal'
import * as migration_20261110_142927_kunjungan from './20261110_142927_kunjungan'
import * as migration_20261110_153140_otomasi_artikel from './20261110_153140_otomasi_artikel'

export const migrations = [
  {
    up: migration_20261106_152942_awal.up,
    down: migration_20261106_152942_awal.down,
    name: '20261106_152942_awal',
  },
  {
    up: migration_20261106_163351_kunci_data_api.up,
    down: migration_20261106_163351_kunci_data_api.down,
    name: '20261106_163351_kunci_data_api',
  },
  {
    up: migration_20261109_152615_ruang_redaksi.up,
    down: migration_20261109_152615_ruang_redaksi.down,
    name: '20261109_152615_ruang_redaksi',
  },
  {
    up: migration_20261109_202605_beranda_portal.up,
    down: migration_20261109_202605_beranda_portal.down,
    name: '20261109_202605_beranda_portal',
  },
  {
    up: migration_20261110_142927_kunjungan.up,
    down: migration_20261110_142927_kunjungan.down,
    name: '20261110_142927_kunjungan',
  },
  {
    up: migration_20261110_153140_otomasi_artikel.up,
    down: migration_20261110_153140_otomasi_artikel.down,
    name: '20261110_153140_otomasi_artikel',
  },
]
