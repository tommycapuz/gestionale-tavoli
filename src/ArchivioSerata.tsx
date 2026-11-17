import RiepilogoSerata from './RiepilogoSerata'
import type { DatiRichiesta } from './NuovaRichiesta'

export type RichiestaArchiviata = DatiRichiesta & {
  id: string
  pr: string
  accettata: boolean
}

export type DatiArchivio = {
  chiusaIl: string
  tavoli: {
    id: string
    numero: number
    zona: 'Console' | 'Privé' | 'Pista'
  }[]
  richieste: Record<string, RichiestaArchiviata[]>
}

type Props = {
  serataId: string
  archivio: DatiArchivio
}

function euro(importo: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(importo)
}

function ArchivioSerata({ serataId, archivio }: Props) {
  return (
    <>
      <div className="avviso-archivio">
        <strong>Serata chiusa · Sola consultazione</strong>
        <p>
          Archiviata il{' '}
          {new Date(archivio.chiusaIl).toLocaleString('it-IT')}.
          Le richieste e le assegnazioni sono conservate.
        </p>
      </div>

      <RiepilogoSerata
        serataId={serataId}
        tavoli={archivio.tavoli}
        richieste={archivio.richieste}
      />

      <section className="pannello">
        <h2>Tutte le richieste della serata</h2>

        {archivio.tavoli.map((tavolo) => {
          const richieste = archivio.richieste[tavolo.id] ?? []
          const prenotato = richieste.some(
            (richiesta) => richiesta.accettata,
          )

          return (
            <section className="tavolo-archiviato" key={tavolo.id}>
              <h3>
                {tavolo.zona} · Tavolo {tavolo.numero}
              </h3>

              {richieste.length === 0 ? (
                <p>Nessuna richiesta.</p>
              ) : (
                <div className="elenco-richieste">
                  {richieste.map((richiesta) => (
                    <article
                      className="scheda-richiesta"
                      key={richiesta.id}
                    >
                      <h3>{richiesta.gruppo}</h3>

                      <p>
                        PR: {richiesta.pr} · Responsabile:{' '}
                        {richiesta.responsabile}
                      </p>

                      <p>
                        {richiesta.persone} pass ·{' '}
                        {euro(richiesta.totale / richiesta.persone)}{' '}
                        a persona
                      </p>

                      <strong>
                        Totale: {euro(richiesta.totale)}
                      </strong>

                      <p
                        className={
                          richiesta.accettata
                            ? 'stato-prenotato'
                            : 'stato-richieste'
                        }
                      >
                        {richiesta.accettata
                          ? 'Accettata alla chiusura'
                          : prenotato
                            ? 'Non selezionata'
                            : 'Non assegnata alla chiusura'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </section>
    </>
  )
}

export default ArchivioSerata