import { useState } from 'react'
import type { FormEvent } from 'react'
import './NuovaRichiesta.css'

export type DatiRichiesta = {
  gruppo: string
  responsabile: string
  persone: number
  totale: number
}

type Props = {
  onInvia: (dati: DatiRichiesta) => void
  onAnnulla: () => void
}

function euro(valore: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(valore)
}

function NuovaRichiesta({ onInvia, onAnnulla }: Props) {
  const [gruppo, setGruppo] = useState('')
  const [responsabile, setResponsabile] = useState('')
  const [pass, setPass] = useState('')
  const [importo, setImporto] = useState('')
  const [baseCalcolo, setBaseCalcolo] =
    useState<'persona' | 'totale'>('persona')
  const [errore, setErrore] = useState('')

  const persone = Number(pass)
  const valore = Number(importo)

  const valoriValidi =
    Number.isInteger(persone) &&
    persone > 0 &&
    Number.isFinite(valore) &&
    valore > 0

  const centesimi = Math.round(valore * 100)

  const totaleCentesimi = valoriValidi
    ? baseCalcolo === 'persona'
      ? centesimi * persone
      : centesimi
    : 0

  const totale = totaleCentesimi / 100

  const quota = valoriValidi
    ? totale / persone
    : 0

  function cambiaImporto(
    nuovaBase: 'persona' | 'totale',
    nuovoImporto: string,
  ) {
    setBaseCalcolo(nuovaBase)
    setImporto(nuovoImporto)
  }

  function invia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrore('')

    if (!gruppo.trim() || !responsabile.trim()) {
      setErrore('Inserisci il nome del gruppo e del responsabile.')
      return
    }

    if (
      !valoriValidi ||
      !Number.isSafeInteger(totaleCentesimi) ||
      totaleCentesimi <= 0
    ) {
      setErrore('Inserisci pass e importi validi, maggiori di zero.')
      return
    }

    onInvia({
      gruppo: gruppo.trim(),
      responsabile: responsabile.trim(),
      persone,
      totale,
    })
  }

  return (
    <form className="modulo-richiesta" onSubmit={invia}>
      <h3>Nuova richiesta</h3>

      <p className="nota-modulo">
        PR: Tommaso · Account dimostrativo
      </p>

      <div className="campi-richiesta">
        <label>
          Nome del gruppo / tavolo
          <input
            type="text"
            value={gruppo}
            onChange={(evento) => setGruppo(evento.target.value)}
            placeholder="Es. Compleanno Marco"
            maxLength={100}
            required
          />
        </label>

        <label>
          Staff / responsabile
          <input
            type="text"
            value={responsabile}
            onChange={(evento) => setResponsabile(evento.target.value)}
            placeholder="Es. Albi"
            maxLength={100}
            required
          />
        </label>

        <label>
          Numero di pass
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={pass}
            onChange={(evento) => setPass(evento.target.value)}
            placeholder="Es. 5"
            required
          />
        </label>

        <label>
          Spesa a persona (€)
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={
              baseCalcolo === 'persona'
                ? importo
                : valoriValidi
                  ? quota.toFixed(2)
                  : ''
            }
            onChange={(evento) =>
              cambiaImporto('persona', evento.target.value)
            }
            placeholder="Es. 35"
            required
          />
        </label>

        <label>
          Spesa totale (€)
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={
              baseCalcolo === 'totale'
                ? importo
                : valoriValidi
                  ? totale.toFixed(2)
                  : ''
            }
            onChange={(evento) =>
              cambiaImporto('totale', evento.target.value)
            }
            placeholder="Es. 175"
            required
          />
        </label>
      </div>

      <p className="nota-modulo">
        Modifica uno dei due importi: l’altro viene calcolato
        automaticamente. Cambiando i pass, rimane fisso l’ultimo
        importo inserito manualmente.
      </p>

      {valoriValidi && (
        <div className="riepilogo-proposta" aria-live="polite">
          <strong>{persone} pass</strong>
          <span>Quota media: {euro(quota)}</span>
          <strong>Totale: {euro(totale)}</strong>
          <small>
            La quota media è arrotondata al centesimo.
          </small>
        </div>
      )}

      {errore && <p className="errore-richiesta" role="alert">{errore}</p>}

      <div className="azioni-richiesta">
        <button type="submit" className="pulsante-principale">
          Invia richiesta
        </button>

        <button
          type="button"
          className="pulsante-secondario"
          onClick={onAnnulla}
        >
          Annulla
        </button>
      </div>
    </form>
  )
}

export default NuovaRichiesta