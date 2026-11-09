import { KOLOM_JEBAKAN } from '@/modules/pembaca/tipe'

import gaya from './Pembaca.module.css'

/**
 * Kolom jebakan anti-spam: di luar layar, tidak bisa difokus, dan disembunyikan dari pembaca layar. Manusia tidak
 * mengisinya; bot pengisi form biasanya mengisi semua kolom, dan kirimannya dijawab berhasil tanpa disimpan.
 */
export function Jebakan() {
  return (
    <div className={gaya.jebakan} aria-hidden="true">
      <label>
        Situs web (kosongkan)
        <input type="text" name={KOLOM_JEBAKAN} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
}
