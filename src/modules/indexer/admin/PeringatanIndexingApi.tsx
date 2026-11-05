import './indexing.scss'

/** Dokumentasi resmi Indexing API (diperiksa 5 November 2026). */
export const URL_KETENTUAN_INDEXING_API = 'https://developers.google.com/search/apis/indexing-api/v3/using-api'

/**
 * Peringatan tepat di atas saklar Indexing API (spesifikasi §8 langkah 4): Google hanya mengizinkan
 * API ini untuk halaman JobPosting dan BroadcastEvent, jadi saklarnya mati secara bawaan.
 */
export function PeringatanIndexingApi() {
  return (
    <div className="indexing-peringatan" role="note" aria-labelledby="indexing-peringatan-judul">
      <p className="indexing-peringatan__judul" id="indexing-peringatan-judul">
        Indexing API bukan untuk artikel
      </p>
      <p>
        Google hanya mengizinkannya untuk halaman lowongan kerja (JobPosting) dan siaran langsung (BroadcastEvent di dalam
        VideoObject). Menyalakannya untuk artikel, tools, atau halaman lain berada di luar ketentuan Google.
      </p>
      <p>
        <a href={URL_KETENTUAN_INDEXING_API}>Baca ketentuan Indexing API</a>
      </p>
    </div>
  )
}
