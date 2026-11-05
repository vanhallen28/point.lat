import { BUTIR_REVIEW, PETUNJUK_REVIEW } from '../review'

import './review.scss'

/**
 * Petunjuk di atas checklist "Review sebelum terbit" (field `ui`): kenapa checklist muncul dan arti setiap
 * butir, sesuai urutan kotak centang di bawahnya. Ditulis sendiri karena deskripsi field bawaan Payload
 * memakai warna redup yang gagal kontras WCAG.
 */
export function PetunjukReview() {
  return (
    <div className="asisten-review" id="petunjuk-review-ai">
      <p>{PETUNJUK_REVIEW}</p>
      <ul>
        {BUTIR_REVIEW.map((b) => (
          <li key={b.name}>{b.keterangan}</li>
        ))}
      </ul>
    </div>
  )
}
