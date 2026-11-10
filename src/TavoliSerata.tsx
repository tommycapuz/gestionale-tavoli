import { useState } from 'react'
import NuovaRichiesta from './NuovaRichiesta'
import type { DatiRichiesta } from './NuovaRichiesta'

type Richiesta = DatiRichiesta & {
  id: string
  pr: string
  accettata: boolean
}

type Tavolo = {
  id: string
  numero: number
  zona: 'Console' | 'Privé' | 'Pista'
}

type RichiesteTavoli = Record<string, Richiesta[]>

const tavoli: Tavolo[] = [
  { id: 'console-1', numero: 1, zona: 'Console' },
  { id: 'console-2', numero: 2, zona: 'Console' },
  { id: 'prive-26', numero: 26, zona: 'Privé' },
  { id: 'prive-27', numero: 27, zona: 'Privé' },
  { id: 'pista-10', numero: 10, zona: 'Pista' },
  { id: 'pista-11', numero: 11, zona: 'Pista' },
]

const richiesteDemo: Record<string, RichiesteTavoli> = {
  '2026-11-13': {
    'prive-26': [
      {
        id: 'richiesta-1',
        gruppo: 'Compleanno Marco',
        pr: 'Tommaso',
        responsabile: 'Albi',
        persone: 10,
        totale: 350,
        accettata: false,
      },
      {
        id: 'richiesta-2',
        gruppo: 'Gruppo Andrea',
        pr: 'Luca',
        responsabile: 'Albi',
        persone: 12,
        totale: 360,
        accettata: false,
      },
    ],
    'console-1': [
      {
        id: 'richiesta-3',
        gruppo: 'Compleanno Giulia',
        pr: 'Sara',
        responsabile: 'Albi',
        persone: 8,
        totale: 400,
        accettata: true,
      },
    ],
  },
}

const zone = ['Console', 'Privé', 'Pista'] as const

function euro(importo: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(importo)
}

function richiestaValida(valore: unknown): valore is Richiesta {
  if (typeof valore !== 'object' || valore === null) return false

  const richiesta = valore as Record<string, unknown>

  return (
    typeof richiesta.id === 'string' &&
    typeof richiesta.gruppo === 'string' &&
    typeof richiesta.pr === 'string' &&
    typeof richiesta.responsabile === 'string' &&
    typeof richiesta.accettata === 'boolean' &&
    typeof richiesta.persone === 'number' &&
    Number.isInteger(richiesta.persone) &&
    richiesta.persone > 0 &&
    typeof richiesta.totale === 'number' &&
    Number.isFinite(richiesta.totale) &&
    richiesta.totale > 0
  )
}

function leggiRichieste(
  chiave: string,
  serataId: string,
): RichiesteTavoli {
  try {
    const salvate = localStorage.getItem(chiave)

    if (salvate !== null) {
      const dati: unknown = JSON.parse(salvate)

      if (
        typeof dati === 'object' &&
        dati !== null &&
        !Array.isArray(dati) &&
        Object.values(dati).every(
          (elenco: unknown) =>
            Array.isArray(elenco) && elenco.every(richiestaValida),
        )
      ) {
        return dati as RichiesteTavoli
      }
    }
  } catch {
    // Se la lettura non riesce, utilizziamo i dati dimostrativi.
  }

  return richiesteDemo[serataId] ?? {}
}

function TavoliSerata({ serataId }: { serataId: string }) {
  const chiaveArchivio = `gestionale-tavoli:richieste:v1:${serataId}`

  const [richiesteSerata, setRichiesteSerata] =
    useState<RichiesteTavoli>(() =>
      leggiRichieste(chiaveArchivio, serataId),
    )

  const [tavoloApertoId, setTavoloApertoId] =
    useState<string | null>(null)

  const [moduloTavoloId, setModuloTavoloId] =
    useState<string | null>(null)

  const [erroreSalvataggio, setErroreSalvataggio] = useState('')

  function apriOChiudiTavolo(tavoloId: string) {
    setTavoloApertoId((precedente) =>
      precedente === tavoloId ? null : tavoloId,
    )

    setModuloTavoloId(null)
    setErroreSalvataggio('')
  }

  function aggiungiRichiesta(
    tavoloId: string,
    dati: DatiRichiesta,
  ) {
    const esistenti = richiesteSerata[tavoloId] ?? []

    if (esistenti.some((richiesta) => richiesta.accettata)) {
      setErroreSalvataggio('Il tavolo è già prenotato.')
      return
    }

    const nuova: Richiesta = {
      ...dati,
      id: crypto.randomUUID(),
      pr: 'Tommaso',
      accettata: false,
    }

    const aggiornate: RichiesteTavoli = {
      ...richiesteSerata,
      [tavoloId]: [...esistenti, nuova],
    }

    try {
      localStorage.setItem(
        chiaveArchivio,
        JSON.stringify(aggiornate),
      )
    } catch {
      setErroreSalvataggio(
        'Il browser non riesce a salvare la richiesta. ' +
        'Controlla che sia consentito il salvataggio dei dati del sito.',
      )
      return
    }

    setRichiesteSerata(aggiornate)
    setModuloTavoloId(null)
    setErroreSalvataggio('')
  }

  return (
    <section className="gestione-tavoli">
      <div className="legenda">
        <span className="stato-libero">● Libero</span>
        <span className="stato-richieste">● Richieste in attesa</span>
        <span className="stato-prenotato">● Prenotato</span>
      </div>

      <p className="nota-demo">
        Modalità demo · PR Tommaso.
        Le richieste sono salvate solo in questo browser.
      </p>

      {zone.map((zona) => (
        <section className="zona-tavoli" key={zona}>
          <h2>{zona}</h2>

          <div className="griglia-tavoli">
            {tavoli
              .filter((tavolo) => tavolo.zona === zona)
              .map((tavolo) => {
                const richieste = richiesteSerata[tavolo.id] ?? []

                const prenotato = richieste.some(
                  (richiesta) => richiesta.accettata,
                )

                const aperto = tavoloApertoId === tavolo.id
                const pannelloId =
                  `dettagli-${serataId}-${tavolo.id}`

                const stato = prenotato
                  ? 'prenotato'
                  : richieste.length > 0
                    ? 'richieste'
                    : 'libero'

                const descrizione = prenotato
                  ? 'Prenotato'
                  : richieste.length > 0
                    ? `${richieste.length} ${
                        richieste.length === 1
                          ? 'richiesta'
                          : 'richieste'
                      }`
                    : 'Libero'

                return (
                  <div className="elemento-tavolo" key={tavolo.id}>
                    <button
                      type="button"
                      className={`scheda-tavolo stato-${stato}`}
                      onClick={() => apriOChiudiTavolo(tavolo.id)}
                      aria-expanded={aperto}
                      aria-controls={pannelloId}
                    >
                      <span>Tavolo</span>
                      <strong>{tavolo.numero}</strong>
                      <span>
                        {descrizione} · {aperto ? 'Chiudi ↑' : 'Apri ↓'}
                      </span>
                    </button>

                    <section
                      id={pannelloId}
                      className="pannello dettagli-inline"
                      hidden={!aperto}
                      aria-label={
                        `Richieste ${zona}, tavolo ${tavolo.numero}`
                      }
                    >
                      <h3 className="titolo-richieste">
                        Richieste · {zona} {tavolo.numero}
                      </h3>

                      {richieste.length === 0 ? (
                        <p>Nessuna richiesta per questo tavolo.</p>
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
                                {euro(
                                  richiesta.totale / richiesta.persone,
                                )}{' '}
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
                                  ? 'Accettata'
                                  : 'In attesa'}
                              </p>
                            </article>
                          ))}
                        </div>
                      )}

                      {prenotato ? (
                        <p>
                          Tavolo prenotato: non è possibile
                          inviare nuove richieste.
                        </p>
                      ) : aperto && moduloTavoloId === tavolo.id ? (
                        <NuovaRichiesta
                          key={`${serataId}-${tavolo.id}`}
                          onInvia={(dati) =>
                            aggiungiRichiesta(tavolo.id, dati)
                          }
                          onAnnulla={() => {
                            setModuloTavoloId(null)
                            setErroreSalvataggio('')
                          }}
                        />
                      ) : (
                        <div className="azioni-richiesta">
                          <button
                            type="button"
                            className="pulsante-principale"
                            onClick={() => {
                              setModuloTavoloId(tavolo.id)
                              setErroreSalvataggio('')
                            }}
                          >
                            + Nuova richiesta
                          </button>
                        </div>
                      )}

                      {aperto && erroreSalvataggio && (
                        <p className="errore-richiesta" role="alert">
                          {erroreSalvataggio}
                        </p>
                      )}
                    </section>
                  </div>
                )
              })}
          </div>
        </section>
      ))}
    </section>
  )
}

export default TavoliSerata