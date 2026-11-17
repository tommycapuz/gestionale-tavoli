import { useState } from 'react'
import NuovaRichiesta from './NuovaRichiesta'
import type { DatiRichiesta } from './NuovaRichiesta'
import RiepilogoSerata from './RiepilogoSerata'
import type { Profilo } from './profilo'

type Richiesta = DatiRichiesta & {
  id: string
  pr: string
  prId?: string
  accettata: boolean
}

type Tavolo = {
  id: string
  numero: number
  zona: 'Console' | 'Privé' | 'Pista'
}

type RichiesteTavoli = Record<string, Richiesta[]>

type ModuloAperto = {
  tavoloId: string
  richiestaId: string | null
}

type Props = {
  serataId: string
  profilo: Profilo
  onChiudi?: (
    richieste: RichiesteTavoli,
    configurazioneTavoli: Tavolo[],
  ) => void
}

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
    (richiesta.prId === undefined || typeof richiesta.prId === 'string') &&
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
            Array.isArray(elenco) &&
            elenco.every(richiestaValida),
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

function TavoliSerata({ serataId, profilo, onChiudi }: Props) {
  const ruolo = profilo.ruolo
  const gestore = ruolo === 'capo' || ruolo === 'admin'

  function propria(richiesta: Richiesta) {
    return richiesta.prId === profilo.id
  }
  const chiaveArchivio =
    `gestionale-tavoli:richieste:v1:${serataId}`

  const [richiesteSerata, setRichiesteSerata] =
    useState<RichiesteTavoli>(() =>
      leggiRichieste(chiaveArchivio, serataId),
    )

  const [tavoloApertoId, setTavoloApertoId] =
    useState<string | null>(null)

  const [moduloAperto, setModuloAperto] =
    useState<ModuloAperto | null>(null)

  const [erroreSalvataggio, setErroreSalvataggio] = useState('')

  function salvaRichieste(aggiornate: RichiesteTavoli) {
    try {
      localStorage.setItem(
        chiaveArchivio,
        JSON.stringify(aggiornate),
      )
    } catch {
      setErroreSalvataggio(
        'Il browser non riesce a salvare i dati. ' +
        'La modifica non è stata applicata.',
      )
      return false
    }

    setRichiesteSerata(aggiornate)
    setErroreSalvataggio('')
    return true
  }

  function chiudiModulo() {
    setModuloAperto(null)
    setErroreSalvataggio('')
  }

  function apriOChiudiTavolo(tavoloId: string) {
    setTavoloApertoId((precedente) =>
      precedente === tavoloId ? null : tavoloId,
    )
    chiudiModulo()
  }

  function apriModulo(
    tavoloId: string,
    richiestaId: string | null,
  ) {
    if (ruolo !== 'pr') return

    setModuloAperto({ tavoloId, richiestaId })
    setErroreSalvataggio('')
  }

  function inviaRichiesta(
    tavoloId: string,
    richiestaId: string | null,
    dati: DatiRichiesta,
  ) {
    if (ruolo !== 'pr') return

    const esistenti = richiesteSerata[tavoloId] ?? []
    let aggiornateTavolo: Richiesta[]

    if (richiestaId !== null) {
      const originale = esistenti.find(
        (richiesta) => richiesta.id === richiestaId,
      )

      if (
        !originale ||
        !propria(originale) ||
        originale.accettata
      ) {
        setErroreSalvataggio(
          'Questa richiesta non può essere modificata.',
        )
        return
      }

      aggiornateTavolo = esistenti.map((richiesta) =>
        richiesta.id === richiestaId
          ? { ...richiesta, ...dati }
          : richiesta,
      )
    } else {
      if (esistenti.some((richiesta) => richiesta.accettata)) {
        setErroreSalvataggio('Il tavolo è già prenotato.')
        return
      }

      aggiornateTavolo = [
        ...esistenti,
        {
          ...dati,
          id: crypto.randomUUID(),
          pr: profilo.nome,
          prId: profilo.id,
          accettata: false,
        },
      ]
    }

    if (
      salvaRichieste({
        ...richiesteSerata,
        [tavoloId]: aggiornateTavolo,
      })
    ) {
      setModuloAperto(null)
    }
  }

  function ritiraRichiesta(
    tavoloId: string,
    richiestaId: string,
  ) {
    if (ruolo !== 'pr') return

    const esistenti = richiesteSerata[tavoloId] ?? []

    const richiesta = esistenti.find(
      (elemento) => elemento.id === richiestaId,
    )

    if (
      !richiesta ||
      !propria(richiesta) ||
      richiesta.accettata
    ) {
      setErroreSalvataggio(
        'Questa richiesta non può essere ritirata.',
      )
      return
    }

    if (
      !window.confirm(
        `Vuoi ritirare la richiesta "${richiesta.gruppo}"?`,
      )
    ) {
      return
    }

    if (
      salvaRichieste({
        ...richiesteSerata,
        [tavoloId]: esistenti.filter(
          (elemento) => elemento.id !== richiestaId,
        ),
      })
    ) {
      setModuloAperto(null)
    }
  }

  function accettaRichiesta(
    tavoloId: string,
    richiestaId: string,
  ) {
    if (!gestore) return

    const esistenti = richiesteSerata[tavoloId] ?? []

    const scelta = esistenti.find(
      (richiesta) => richiesta.id === richiestaId,
    )

    if (!scelta || scelta.accettata) return

    const precedente = esistenti.find(
      (richiesta) => richiesta.accettata,
    )

    if (
      precedente &&
      !window.confirm(
        `Sostituire "${precedente.gruppo}" con "${scelta.gruppo}"?`,
      )
    ) {
      return
    }

    const aggiornateTavolo = esistenti.map((richiesta) => ({
      ...richiesta,
      accettata: richiesta.id === richiestaId,
    }))

    salvaRichieste({
      ...richiesteSerata,
      [tavoloId]: aggiornateTavolo,
    })
  }

  function revocaAssegnazione(tavoloId: string) {
    if (!gestore) return

    const esistenti = richiesteSerata[tavoloId] ?? []

    const accettata = esistenti.find(
      (richiesta) => richiesta.accettata,
    )

    if (!accettata) return

    if (
      !window.confirm(
        `Revocare l’assegnazione a "${accettata.gruppo}"? ` +
        'La richiesta rimarrà nell’elenco.',
      )
    ) {
      return
    }

    salvaRichieste({
      ...richiesteSerata,
      [tavoloId]: esistenti.map((richiesta) => ({
        ...richiesta,
        accettata: false,
      })),
    })
  }

  return (
    <section className="gestione-tavoli">
      <p className="nota-demo">
        {gestore ? 'Gestione tavoli' : `PR: ${profilo.nome}`}.{' '}
        Richieste salvate in questo browser.
      </p>

      {Object.values(richiesteSerata).some((elenco) =>
        elenco.some((richiesta) => !richiesta.prId),
      ) && (
        <p className="nota-demo">
          Le richieste precedenti al collegamento degli account sono
          conservate. Non avendo un ID autore, non possono essere
          modificate o ritirate dai PR. Il capo può gestirne l’assegnazione.
        </p>
      )}

      <div className="legenda">
        <span className="stato-libero">● Libero</span>
        <span className="stato-richieste">
          ● Richieste in attesa
        </span>
        <span className="stato-prenotato">● Prenotato</span>
      </div>

      {gestore && onChiudi && (
        <div className="azioni-richiesta">
          <button
            type="button"
            className="pulsante-secondario"
            onClick={() => onChiudi(richiesteSerata, tavoli)}
          >
            Chiudi serata e archivia
          </button>
        </div>
      )}

      {zone.map((zona) => (
        <section className="zona-tavoli" key={zona}>
          <h2>{zona}</h2>

          <div className="griglia-tavoli">
            {tavoli
              .filter((tavolo) => tavolo.zona === zona)
              .map((tavolo) => {
                const richieste =
                  richiesteSerata[tavolo.id] ?? []

                const prenotato = richieste.some(
                  (richiesta) => richiesta.accettata,
                )

                const aperto =
                  tavoloApertoId === tavolo.id

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

                const richiestaInModifica =
                  moduloAperto?.tavoloId === tavolo.id
                    ? richieste.find(
                        (richiesta) =>
                          richiesta.id ===
                          moduloAperto.richiestaId,
                      )
                    : undefined

                const mostraModulo =
                  ruolo === 'pr' &&
                  aperto &&
                  moduloAperto?.tavoloId === tavolo.id

                return (
                  <div
                    className="elemento-tavolo"
                    key={tavolo.id}
                  >
                    <button
                      type="button"
                      className={`scheda-tavolo stato-${stato}`}
                      onClick={() =>
                        apriOChiudiTavolo(tavolo.id)
                      }
                      aria-expanded={aperto}
                      aria-controls={pannelloId}
                    >
                      <span>Tavolo</span>
                      <strong>{tavolo.numero}</strong>

                      <span>
                        {descrizione} ·{' '}
                        {aperto ? 'Chiudi ↑' : 'Apri ↓'}
                      </span>
                    </button>

                    <section
                      id={pannelloId}
                      className="pannello dettagli-inline"
                      hidden={!aperto}
                      aria-label={
                        `Richieste ${zona}, ` +
                        `tavolo ${tavolo.numero}`
                      }
                    >
                      <h3 className="titolo-richieste">
                        Richieste · {zona} {tavolo.numero}
                      </h3>

                      {richieste.length === 0 ? (
                        <p>
                          Nessuna richiesta per questo tavolo.
                        </p>
                      ) : (
                        <div className="elenco-richieste">
                          {richieste.map((richiesta) => (
                            <article
                              className="scheda-richiesta"
                              key={richiesta.id}
                            >
                              <h3>{richiesta.gruppo}</h3>

                              <p>
                                PR: {richiesta.pr} ·
                                Responsabile:{' '}
                                {richiesta.responsabile}
                              </p>

                              <p>
                                {richiesta.persone} pass ·{' '}
                                {euro(
                                  richiesta.totale /
                                    richiesta.persone,
                                )}{' '}
                                a persona
                              </p>

                              <strong>
                                Totale:{' '}
                                {euro(richiesta.totale)}
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
                                  : prenotato
                                    ? 'Non selezionata'
                                    : 'In attesa'}
                              </p>

                              {ruolo === 'pr' &&
                                propria(richiesta) &&
                                !richiesta.accettata && (
                                  <div className="azioni-richiesta">
                                    <button
                                      type="button"
                                      className="pulsante-secondario"
                                      onClick={() =>
                                        apriModulo(
                                          tavolo.id,
                                          richiesta.id,
                                        )
                                      }
                                    >
                                      Modifica
                                    </button>

                                    <button
                                      type="button"
                                      className="pulsante-secondario"
                                      onClick={() =>
                                        ritiraRichiesta(
                                          tavolo.id,
                                          richiesta.id,
                                        )
                                      }
                                    >
                                      Ritira
                                    </button>
                                  </div>
                                )}

                              {gestore && (
                                <div className="azioni-richiesta">
                                  {richiesta.accettata ? (
                                    <button
                                      type="button"
                                      className="pulsante-secondario"
                                      onClick={() =>
                                        revocaAssegnazione(
                                          tavolo.id,
                                        )
                                      }
                                    >
                                      Revoca assegnazione
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="pulsante-principale"
                                      onClick={() =>
                                        accettaRichiesta(
                                          tavolo.id,
                                          richiesta.id,
                                        )
                                      }
                                    >
                                      {prenotato
                                        ? 'Assegna a questa proposta'
                                        : 'Accetta proposta'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      )}

                      {ruolo === 'pr' && (
                        mostraModulo && moduloAperto ? (
                          <NuovaRichiesta
                            key={
                              `${tavolo.id}-` +
                              (
                                moduloAperto.richiestaId ??
                                'nuova'
                              )
                            }
                            datiIniziali={richiestaInModifica}
                            nomePr={profilo.nome}
                            onInvia={(dati) =>
                              inviaRichiesta(
                                tavolo.id,
                                moduloAperto.richiestaId,
                                dati,
                              )
                            }
                            onAnnulla={chiudiModulo}
                          />
                        ) : prenotato ? (
                          <p>
                            Tavolo prenotato: non è possibile
                            inviare nuove richieste.
                          </p>
                        ) : (
                          <div className="azioni-richiesta">
                            <button
                              type="button"
                              className="pulsante-principale"
                              onClick={() =>
                                apriModulo(tavolo.id, null)
                              }
                            >
                              + Nuova richiesta
                            </button>
                          </div>
                        )
                      )}

                      {aperto && erroreSalvataggio && (
                        <p
                          className="errore-richiesta"
                          role="alert"
                        >
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

      {gestore && (
        <RiepilogoSerata
          serataId={serataId}
          tavoli={tavoli}
          richieste={richiesteSerata}
        />
      )}
    </section>
  )
}

export default TavoliSerata