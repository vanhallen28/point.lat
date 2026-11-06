import * as migration_20261106_152942_awal from './20261106_152942_awal';
import * as migration_20261106_163351_kunci_data_api from './20261106_163351_kunci_data_api';

export const migrations = [
  {
    up: migration_20261106_152942_awal.up,
    down: migration_20261106_152942_awal.down,
    name: '20261106_152942_awal',
  },
  {
    up: migration_20261106_163351_kunci_data_api.up,
    down: migration_20261106_163351_kunci_data_api.down,
    name: '20261106_163351_kunci_data_api'
  },
];
