import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import './GestioneSerate.css'
import TavoliSerata from './TavoliSerata'


type TipoSerata = 'Venerdì' | 'Sabato' | 'Speciale'

type Serata = {
  id: string
  nome: string
  data: string
  etaMinima: number
  tipo: TipoSerata
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

function serataValida(valore: unknown): valore is Serata {
  if (typeof valore !== 'object' || valore === null) return false

  const serata = valore as Record<string, unknown>

  return (
    typeof serata.id === 'string' &&
    typeof serata.nome === 'string' &&
    typeof serata.data === 'string' &&
    dataValida(serata.data) &&
    [14, 16, 18].includes(Number(serata.etaMinima)) &&
    (
      serata.tipo === 'Venerdì' ||
      serata.tipo === 'Sabato' ||
      serata.tipo === 'Speciale'
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

function App() {
  const [serate, setSerate] = useState<Serata[]>(caricaSerate)

  const [serataSelezionata, setSerataSelezionata] =
    useState<Serata | null>(null)

  const [amministrazione, setAmministrazione] = useState(false)

  const [meseVisibile, setMeseVisibile] = useState(
    dataLocaleOggi().slice(0, 7),
  )

  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [tipo, setTipo] = useState<TipoSerata>('Speciale')
  const [etaMinima, setEtaMinima] = useState(18)

  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')

  const serateDelMese = serate
    .filter((serata) => serata.data.startsWith(meseVisibile))
    .sort((prima, seconda) => prima.data.localeCompare(seconda.data))

  function cambiaVista(admin: boolean) {
    setAmministrazione(admin)
    setSerataSelezionata(null)
    setErrore('')
    setMessaggio('')
  }

  function cambiaTipo(nuovoTipo: TipoSerata) {
    setTipo(nuovoTipo)

    if (nuovoTipo === 'Venerdì') {
      setEtaMinima(18)
    } else if (nuovoTipo === 'Sabato') {
      setEtaMinima(16)
    }
  }

  function creaSerata(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrore('')
    setMessaggio('')

    if (!amministrazione) return

    if (!nome.trim() || !dataValida(data)) {
      setErrore('Inserisci un nome e una data valida.')
      return
    }

    const giornoSettimana =
      new Date(`${data}T12:00:00`).getDay()

    if (tipo === 'Venerdì' && giornoSettimana !== 5) {
      setErrore(
        'La data scelta non è un venerdì. ' +
        'Correggi la data oppure scegli Evento speciale.',
      )
      return
    }

    if (tipo === 'Sabato' && giornoSettimana !== 6) {
      setErrore(
        'La data scelta non è un sabato. ' +
        'Correggi la data oppure scegli Evento speciale.',
      )
      return
    }

    if (serate.some((serata) => serata.data === data)) {
      setErrore(
        'Esiste già una serata in questa data. ' +
        'In questa prima versione gestiamo un evento per data.',
      )
      return
    }

    const etaEffettiva =
      tipo === 'Venerdì'
        ? 18
        : tipo === 'Sabato'
          ? 16
          : etaMinima

    const nuovaSerata: Serata = {
      id: data,
      nome: nome.trim(),
      data,
      etaMinima: etaEffettiva,
      tipo,
    }

    const aggiornate = [...serate, nuovaSerata]

    try {
      localStorage.setItem(
        chiaveSerate,
        JSON.stringify(aggiornate),
      )
    } catch {
      setErrore(
        'Il browser non riesce a salvare la nuova serata. ' +
        'Nessuna modifica è stata applicata.',
      )
      return
    }

    setSerate(aggiornate)
    setMeseVisibile(data.slice(0, 7))
    setMessaggio(`Serata "${nuovaSerata.nome}" creata.`)
    setNome('')
    setData('')
  }

  return (
    <div className="app">
      <header className="barra-superiore">
        <a className="marchio" href="/">
          GESTIONALE TAVOLI
        </a>

        <span className="badge-demo">Modalità demo</span>
      </header>

      <main className="contenuto">
        <nav className="navigazione-demo" aria-label="Viste dimostrative">
          <button
            type="button"
            className={
              !amministrazione
                ? 'pulsante-principale'
                : 'pulsante-secondario'
            }
            aria-pressed={!amministrazione}
            onClick={() => cambiaVista(false)}
          >
            Serate
          </button>

          <button
            type="button"
            className={
              amministrazione
                ? 'pulsante-principale'
                : 'pulsante-secondario'
            }
            aria-pressed={amministrazione}
            onClick={() => cambiaVista(true)}
          >
            Amministrazione
          </button>
        </nav>

        {serataSelezionata ? (
          <>
            <div className="azioni-richiesta">
              <button
                type="button"
                className="pulsante-indietro"
                onClick={() => setSerataSelezionata(null)}
              >
                ← Torna alle serate
              </button>
            </div>

            <p className="etichetta">
              {formattaData(serataSelezionata.data)}
            </p>

            <h1>{serataSelezionata.nome}</h1>

            <p className="introduzione">
              Serata selezionata · Accesso +{serataSelezionata.etaMinima}
            </p>

            <TavoliSerata
              key={serataSelezionata.id}
              serataId={serataSelezionata.id}
            />
          </>
        ) : (
          <>
            <p className="etichetta">
              {amministrazione ? 'Gestione eventi' : 'Calendario'}
            </p>

            <h1>
              {amministrazione
                ? 'Organizza le serate.'
                : 'Scegli la tua serata.'}
            </h1>

            <p className="introduzione">
              {amministrazione
                ? 'Crea gli eventi e definisci il limite di età.'
                : 'Seleziona un evento per accedere alla gestione dei tavoli.'}
            </p>

            {amministrazione && (
              <section className="pannello">
                <h2>Nuova serata</h2>

                <form className="form-serata" onSubmit={creaSerata}>
                  <label>
                    Nome della serata
                    <input
                      type="text"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      placeholder="Es. Saturday Night"
                      maxLength={100}
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
                    <button
                      type="submit"
                      className="pulsante-principale"
                    >
                      Crea serata
                    </button>
                  </div>
                </form>

                <p className="nota-demo">
                  Venerdì: +18. Sabato: +16.
                  Per eventi +14, anche nel fine settimana,
                  scegli Evento speciale.
                </p>

                {errore && (
                  <p className="errore-richiesta" role="alert">
                    {errore}
                  </p>
                )}

                {messaggio && (
                  <p className="messaggio-serata" role="status">
                    {messaggio}
                  </p>
                )}
              </section>
            )}

            <label className="filtro-mese">
              Mese da visualizzare
              <input
                type="month"
                value={meseVisibile}
                onChange={(evento) => {
                  const valore = evento.target.value

                  if (/^\d{4}-\d{2}$/.test(valore)) {
                    setMeseVisibile(valore)
                  }
                }}
              />
            </label>

            <p className="etichetta">
              {formattaMese(meseVisibile)}
            </p>

            {serateDelMese.length === 0 ? (
              <p className="introduzione">
                Nessuna serata presente in questo mese.
              </p>
            ) : (
              <div className="elenco-serate">
                {serateDelMese.map((serata) => (
                  <button
                    type="button"
                    key={serata.id}
                    className="scheda-serata"
                    onClick={() => setSerataSelezionata(serata)}
                  >
                    <span className="scheda-intestazione">
                      <span className="tipo-serata">{serata.tipo}</span>
                      <span className="limite-eta">
                        +{serata.etaMinima}
                      </span>
                    </span>

                    <span className="nome-serata">{serata.nome}</span>

                    <span className="data-serata">
                      {formattaData(serata.data)}
                    </span>

                    <span className="apri-serata">
                      Apri serata →
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="nota-demo">
              Eventi e richieste sono salvati in questo browser.
              I pulsanti di cambio vista sono dimostrativi:
              gli account e i filtri personali verranno aggiunti dopo.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default App