import { useState } from 'react'
import './App.css'
import TavoliSerata from './TavoliSerata'

type Serata = {
  id: string
  nome: string
  data: string
  etaMinima: number
  tipo: 'Venerdì' | 'Sabato' | 'Speciale'
}

const serate: Serata[] = [
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

function formattaData(data: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${data}T12:00:00`))
}

function App() {
  const [serataSelezionata, setSerataSelezionata] =
    useState<Serata | null>(null)

  return (
    <div className="app">
      <header className="barra-superiore">
        <a className="marchio" href="/">
          GESTIONALE TAVOLI
        </a>

        <span className="badge-demo">Modalità demo</span>
      </header>

      <main className="contenuto">
        {serataSelezionata ? (
          <>
            <button
              type="button"
              className="pulsante-indietro"
              onClick={() => setSerataSelezionata(null)}
            >
              ← Torna alle serate
            </button>

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
            <p className="etichetta">Novembre 2026</p>

            <h1>Scegli la tua serata.</h1>

            <p className="introduzione">
              Seleziona un evento per accedere alla gestione dei tavoli.
            </p>

            <div className="elenco-serate">
              {serate.map((serata) => (
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

                  <span className="apri-serata">Apri serata →</span>
                </button>
              ))}
            </div>

            <p className="nota-demo">
              Eventi di esempio: nomi e date saranno gestiti
              dall’amministratore nella versione completa.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default App