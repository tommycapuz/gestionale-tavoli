import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import './GestioneSerate.css'
import TavoliSerata from './TavoliSerata'
import ArchivioSerata from './ArchivioSerata'
import type { DatiArchivio } from './ArchivioSerata'
import type { Profilo } from './profilo'
import { etaAllaData } from './profilo'
import './InterfacciaAccount.css'

type TipoSerata = 'Venerdì' | 'Sabato' | 'Speciale'
type Vista = 'serate' | 'admin' | 'archivio'

type Serata = {
  id: string
  nome: string
  data: string
  etaMinima: number
  tipo: TipoSerata
  archivio?: DatiArchivio
}

const chiaveSerate = 'gestionale-tavoli:serate:v1'

const serateIniziali: Serata[] = [
  {
    id: '2026-11-13',
    nome: 'Friday Night',
    data: '2026-11-13',
    etaMinima: 18,
    tipo: 'Venerdì',
  },
  {
    id: '2026-11-14',
    nome: 'Saturday Night',
    data: '2026-11-14',
    etaMinima: 16,
    tipo: 'Sabato',
  },
  {
    id: '2026-11-18',
    nome: 'Evento speciale',
    data: '2026-11-18',
    etaMinima: 14,
    tipo: 'Speciale',
  },
]

function dataLocaleOggi() {
  const oggi = new Date()
  const anno = oggi.getFullYear()
  const mese = String(oggi.getMonth() + 1).padStart(2, '0')
  const giorno = String(oggi.getDate()).padStart(2, '0')

  return `${anno}-${mese}-${giorno}`
}

function dataValida(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false

  const valore = new Date(`${data}T12:00:00`)

  return (
    !Number.isNaN(valore.getTime()) &&
    valore.getFullYear() === Number(data.slice(0, 4)) &&
    valore.getMonth() + 1 === Number(data.slice(5, 7)) &&
    valore.getDate() === Number(data.slice(8, 10))
  )
}

function archivioValido(valore: unknown): boolean {
  if (typeof valore !== 'object' || valore === null) return false

  const archivio = valore as Record<string, unknown>

  if (
    typeof archivio.chiusaIl !== 'string' ||
    Number.isNaN(Date.parse(archivio.chiusaIl)) ||
    !Array.isArray(archivio.tavoli) ||
    typeof archivio.richieste !== 'object' ||
    archivio.richieste === null ||
    Array.isArray(archivio.richieste)
  ) {
    return false
  }

  const tavoliValidi = archivio.tavoli.every((valore: unknown) => {
    if (typeof valore !== 'object' || valore === null) return false
    const tavolo = valore as Record<string, unknown>

    return (
      typeof tavolo.id === 'string' &&
      typeof tavolo.numero === 'number' &&
      Number.isInteger(tavolo.numero) &&
      ['Console', 'Privé', 'Pista'].includes(String(tavolo.zona))
    )
  })

  const richiesteValide = Object.values(archivio.richieste).every(
    (elenco: unknown) =>
      Array.isArray(elenco) &&
      elenco.every((valore: unknown) => {
        if (typeof valore !== 'object' || valore === null) return false
        const richiesta = valore as Record<string, unknown>

        return (
          typeof richiesta.id === 'string' &&
          typeof richiesta.gruppo === 'string' &&
          typeof richiesta.responsabile === 'string' &&
          typeof richiesta.pr === 'string' &&
          typeof richiesta.accettata === 'boolean' &&
          typeof richiesta.persone === 'number' &&
          Number.isInteger(richiesta.persone) &&
          richiesta.persone > 0 &&
          typeof richiesta.totale === 'number' &&
          Number.isFinite(richiesta.totale) &&
          richiesta.totale > 0
        )
      }),
  )

  return tavoliValidi && richiesteValide
}

function serataValida(valore: unknown): valore is Serata {
  if (typeof valore !== 'object' || valore === null) return false

  const serata = valore as Record<string, unknown>

  return (
    typeof serata.id === 'string' &&
    typeof serata.nome === 'string' &&
    typeof serata.data === 'string' &&
    dataValida(serata.data) &&
    typeof serata.etaMinima === 'number' &&
    [14, 16, 18].includes(serata.etaMinima) &&
    (
      serata.tipo === 'Venerdì' ||
      serata.tipo === 'Sabato' ||
      serata.tipo === 'Speciale'
    ) &&
    (
      serata.archivio === undefined ||
      archivioValido(serata.archivio)
    )
  )
}

function caricaSerate(): Serata[] {
  try {
    const salvate = localStorage.getItem(chiaveSerate)

    if (salvate !== null) {
      const dati: unknown = JSON.parse(salvate)

      if (Array.isArray(dati) && dati.every(serataValida)) {
        return dati
      }
    }
  } catch {
    // Se la lettura non riesce, mostriamo gli eventi iniziali.
  }

  return serateIniziali
}

function formattaData(data: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${data}T12:00:00`))
}

function formattaMese(mese: string) {
  return new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${mese}-01T12:00:00`))
}

type Props = {
  profilo: Profilo
  onEsci: () => Promise<void>
  uscita: boolean
  erroreUscita: string
}

function App({ profilo, onEsci, uscita, erroreUscita }: Props) {
  const amministratore = profilo.ruolo === 'admin'
  const gestore = amministratore || profilo.ruolo === 'capo'

  function puoVedereSerata(serata: Serata) {
    if (gestore) return true
    if (serata.archivio) return false
    if (etaAllaData(profilo.data_nascita, serata.data) < serata.etaMinima) {
      return false
    }
    return serata.tipo === 'Speciale' ||
      (serata.tipo === 'Venerdì' && profilo.venerdi) ||
      (serata.tipo === 'Sabato' && profilo.sabato)
  }
  const [serate, setSerate] = useState<Serata[]>(caricaSerate)
  const [serataId, setSerataId] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>('serate')

  const [meseVisibile, setMeseVisibile] = useState(
    dataLocaleOggi().slice(0, 7),
  )

  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [tipo, setTipo] = useState<TipoSerata>('Speciale')
  const [etaMinima, setEtaMinima] = useState(18)
  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')

  const serataSelezionata = serate.find(
    (serata) => serata.id === serataId && puoVedereSerata(serata),
  )

  const serateDelMese = serate
    .filter(
      (serata) =>
        puoVedereSerata(serata) &&
        serata.data.startsWith(meseVisibile) &&
        (vista === 'archivio'
          ? serata.archivio !== undefined
          : serata.archivio === undefined),
    )
    .sort((prima, seconda) => prima.data.localeCompare(seconda.data))

  function salvaSerate(aggiornate: Serata[]) {
    try {
      localStorage.setItem(
        chiaveSerate,
        JSON.stringify(aggiornate),
      )
    } catch {
      setErrore(
        'Il browser non riesce a salvare i dati. ' +
        'Nessuna modifica è stata applicata.',
      )
      return false
    }

    setSerate(aggiornate)
    setErrore('')
    return true
  }

  function cambiaVista(nuovaVista: Vista) {
    if (nuovaVista === 'admin' && !amministratore) return
    if (nuovaVista === 'archivio' && !gestore) return
    setVista(nuovaVista)
    setSerataId(null)
    setErrore('')
    setMessaggio('')
  }

  function cambiaTipo(nuovoTipo: TipoSerata) {
    setTipo(nuovoTipo)

    if (nuovoTipo === 'Venerdì') setEtaMinima(18)
    if (nuovoTipo === 'Sabato') setEtaMinima(16)
  }

  function creaSerata(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrore('')
    setMessaggio('')

    if (vista !== 'admin' || !amministratore) return

    if (!nome.trim() || !dataValida(data)) {
      setErrore('Inserisci un nome e una data valida.')
      return
    }

    const giorno = new Date(`${data}T12:00:00`).getDay()

    if (
      (tipo === 'Venerdì' && giorno !== 5) ||
      (tipo === 'Sabato' && giorno !== 6)
    ) {
      setErrore(
        'La data non corrisponde alla tipologia scelta. ' +
        'Correggila oppure scegli Evento speciale.',
      )
      return
    }

    if (serate.some((serata) => serata.data === data)) {
      setErrore(
        'Esiste già una serata in questa data, attiva o archiviata. ' +
        'In questa prima versione gestiamo un evento per data.',
      )
      return
    }

    const nuova: Serata = {
      id: data,
      nome: nome.trim(),
      data,
      tipo,
      etaMinima:
        tipo === 'Venerdì'
          ? 18
          : tipo === 'Sabato'
            ? 16
            : etaMinima,
    }

    if (salvaSerate([...serate, nuova])) {
      setMeseVisibile(data.slice(0, 7))
      setMessaggio(`Serata "${nuova.nome}" creata.`)
      setNome('')
      setData('')
    }
  }

  function archiviaSerata(
    id: string,
    richieste: DatiArchivio['richieste'],
    tavoli: DatiArchivio['tavoli'],
  ) {
    const serata = serate.find((elemento) => elemento.id === id)

    if (!gestore || !serata || serata.archivio) return

    const conferma = window.confirm(
      `Chiudere la serata "${serata.nome}" del ${formattaData(serata.data)}? ` +
      'Le richieste saranno conservate nell’archivio e non saranno più modificabili.',
    )

    if (!conferma) return

    const archivio: DatiArchivio = {
      chiusaIl: new Date().toISOString(),
      tavoli,
      richieste,
    }

    const aggiornate = serate.map((elemento) =>
      elemento.id === id
        ? { ...elemento, archivio }
        : elemento,
    )

    if (salvaSerate(aggiornate)) {
      setVista('archivio')
      setMessaggio('Serata chiusa e archiviata.')
    }
  }

  return (
    <div className="app">
      <header className="barra-superiore">
        <a className="marchio" href="/">GESTIONALE TAVOLI</a>
        <div className="account-barra">
          <span>{profilo.nome} · {profilo.ruolo === 'admin'
            ? 'Amministratore' : profilo.ruolo === 'capo' ? 'Capo' : 'PR'}</span>
          <button type="button" className="pulsante-secondario"
            disabled={uscita} onClick={() => void onEsci()}>
            {uscita ? 'Uscita…' : 'Esci'}
          </button>
        </div>
      </header>

      <main className="contenuto">
        <nav className="navigazione-demo" aria-label="Navigazione gestionale">
          <button
            type="button"
            className={
              vista === 'serate'
                ? 'pulsante-principale'
                : 'pulsante-secondario'
            }
            aria-pressed={vista === 'serate'}
            onClick={() => cambiaVista('serate')}
          >
            Serate
          </button>

          {amministratore && (
          <button
            type="button"
            className={
              vista === 'admin'
                ? 'pulsante-principale'
                : 'pulsante-secondario'
            }
            aria-pressed={vista === 'admin'}
            onClick={() => cambiaVista('admin')}
          >
            Amministrazione
          </button>
          )}

          {gestore && (
          <button
            type="button"
            className={
              vista === 'archivio'
                ? 'pulsante-principale'
                : 'pulsante-secondario'
            }
            aria-pressed={vista === 'archivio'}
            onClick={() => cambiaVista('archivio')}
          >
            Archivio
          </button>
          )}
        </nav>

        {erroreUscita && (
          <p className="errore-richiesta" role="alert">{erroreUscita}</p>
        )}

        <p className="nota-demo">
          Account collegato. Serate e richieste sono ancora salvate
          in questo browser e non sono condivise tra dispositivi.
        </p>

        {errore && (
          <p className="errore-richiesta" role="alert">{errore}</p>
        )}

        {messaggio && (
          <p className="messaggio-serata" role="status">{messaggio}</p>
        )}

        {serataSelezionata ? (
          <>
            <div className="azioni-richiesta">
              <button
                type="button"
                className="pulsante-indietro"
                onClick={() => {
                  setSerataId(null)
                  setErrore('')
                  setMessaggio('')
                }}
              >
                ← {serataSelezionata.archivio
                  ? 'Torna all’archivio'
                  : 'Torna alle serate'}
              </button>
            </div>

            <p className="etichetta">
              {formattaData(serataSelezionata.data)}
            </p>

            <h1>{serataSelezionata.nome}</h1>

            <p className="introduzione">
              Accesso +{serataSelezionata.etaMinima}
            </p>

            {serataSelezionata.archivio ? (
              <ArchivioSerata
                serataId={serataSelezionata.id}
                archivio={serataSelezionata.archivio}
              />
            ) : (
              <TavoliSerata
                key={`${profilo.id}-${serataSelezionata.id}`}
                serataId={serataSelezionata.id}
                profilo={profilo}
                onChiudi={(richieste, tavoli) =>
                  archiviaSerata(
                    serataSelezionata.id,
                    richieste,
                    tavoli,
                  )
                }
              />
            )}
          </>
        ) : (
          <>
            <p className="etichetta">
              {vista === 'admin'
                ? 'Gestione eventi'
                : vista === 'archivio'
                  ? 'Storico'
                  : 'Calendario'}
            </p>

            <h1>
              {vista === 'admin'
                ? 'Organizza le serate.'
                : vista === 'archivio'
                  ? 'Archivio serate.'
                  : 'Scegli la tua serata.'}
            </h1>

            <p className="introduzione">
              {vista === 'admin'
                ? 'Crea gli eventi e definisci il limite di età.'
                : vista === 'archivio'
                  ? 'Consulta le serate chiuse e scarica i riepiloghi.'
                  : 'Seleziona un evento per gestire i tavoli.'}
            </p>

            {vista === 'admin' && (
              <section className="pannello">
                <h2>Nuova serata</h2>

                <form className="form-serata" onSubmit={creaSerata}>
                  <label>
                    Nome della serata
                    <input
                      type="text"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      maxLength={100}
                      placeholder="Es. Saturday Night"
                      required
                    />
                  </label>

                  <label>
                    Data
                    <input
                      type="date"
                      value={data}
                      onChange={(evento) => setData(evento.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Tipologia
                    <select
                      value={tipo}
                      onChange={(evento) =>
                        cambiaTipo(evento.target.value as TipoSerata)
                      }
                    >
                      <option value="Venerdì">Venerdì</option>
                      <option value="Sabato">Sabato</option>
                      <option value="Speciale">Evento speciale</option>
                    </select>
                  </label>

                  <label>
                    Età minima
                    <select
                      value={etaMinima}
                      disabled={tipo !== 'Speciale'}
                      onChange={(evento) =>
                        setEtaMinima(Number(evento.target.value))
                      }
                    >
                      <option value={14}>14 anni</option>
                      <option value={16}>16 anni</option>
                      <option value={18}>18 anni</option>
                    </select>
                  </label>

                  <div className="azioni-richiesta">
                    <button type="submit" className="pulsante-principale">
                      Crea serata
                    </button>
                  </div>
                </form>

                <p className="nota-demo">
                  Venerdì: +18. Sabato: +16.
                  Per eventi +14 scegli Evento speciale.
                </p>
              </section>
            )}

            <label className="filtro-mese">
              Mese da visualizzare
              <input
                type="month"
                value={meseVisibile}
                onChange={(evento) => {
                  const valore = evento.target.value

                  if (
                    /^\d{4}-\d{2}$/.test(valore) &&
                    dataValida(`${valore}-01`)
                  ) {
                    setMeseVisibile(valore)
                  }
                }}
              />
            </label>

            <p className="etichetta">{formattaMese(meseVisibile)}</p>

            {serateDelMese.length === 0 ? (
              <p className="introduzione">
                {vista === 'archivio'
                  ? 'Nessuna serata archiviata in questo mese.'
                  : 'Nessuna serata attiva in questo mese.'}
              </p>
            ) : (
              <div className="elenco-serate">
                {serateDelMese.map((serata) => (
                  <button
                    type="button"
                    key={serata.id}
                    className="scheda-serata"
                    onClick={() => {
                      setSerataId(serata.id)
                      setErrore('')
                      setMessaggio('')
                    }}
                  >
                    <span className="scheda-intestazione">
                      <span className="tipo-serata">
                        {serata.archivio ? 'Archiviata' : serata.tipo}
                      </span>
                      <span className="limite-eta">
                        +{serata.etaMinima}
                      </span>
                    </span>

                    <span className="nome-serata">{serata.nome}</span>

                    <span className="data-serata">
                      {formattaData(serata.data)}
                    </span>

                    <span className="apri-serata">
                      {serata.archivio
                        ? 'Consulta archivio →'
                        : 'Apri serata →'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="nota-demo">
              {gestore
                ? 'Stai consultando tutte le serate del mese selezionato.'
                : 'Vedi le serate compatibili con la tua età alla data dell’evento e con le preferenze scelte.'}
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default App