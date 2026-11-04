import gaya from './page.module.css'

/** Beranda sementara. Blok beranda dari global `beranda` dibangun di Rencana 4B. */
export default function BerandaSementara() {
  return (
    <section className={`kontainer ${gaya.sementara}`}>
      <h1 className={gaya.judul}>Intinya dulu.</h1>
      <p className={gaya.teks}>Situs sedang dibangun.</p>
    </section>
  )
}
