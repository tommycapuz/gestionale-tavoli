import { useState } from 'react'
import type { FormEvent } from 'react'
import './InterfacciaAccount.css'

export type DatiRichiesta = {
  gruppo: string
  responsabile: string
  persone: number
  totale: number
}

type Props = {
  datiIniziali?: DatiRichiesta
  nomePr?: string
  onInvia: (dati: DatiRichiesta) => void
  onAnnulla: () => void
}

function NuovaRichiesta({ datiIniziali, nomePr, onInvia, onAnnulla }: Props) {
  const [gruppo, setGruppo] = useState(datiIniziali?.gruppo ?? '')
  const [responsabile, setResponsabile] = useState(datiIniziali?.responsabile ?? '')
  const [persone, setPersone] = useState(datiIniziali ? String(datiIniziali.persone) : '')
  const [base, setBase] = useState<'persona' | 'totale'>(datiIniziali ? 'totale' : 'persona')
  const [importo, setImporto] = useState(datiIniziali ? String(datiIniziali.totale) : '')
  const [errore, setErrore] = useState('')
  const pass = Number(persone)
  const centesimi = Math.round(Number(importo) * 100)
  const totaleCentesimi = base === 'totale' ? centesimi : centesimi * pass
  const passValidi = Number.isSafeInteger(pass) && pass > 0
  const totaleValido = Number.isSafeInteger(totaleCentesimi) && totaleCentesimi > 0
  const quota = passValidi && totaleValido ? (totaleCentesimi / 100 / pass).toFixed(2) : ''
  const totale = passValidi && totaleValido ? (totaleCentesimi / 100).toFixed(2) : ''

  function cambiaImporto(valore: string, nuovaBase: 'persona' | 'totale') {
    setBase(nuovaBase)
    setImporto(valore)
  }

  function invia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrore('')
    if (!gruppo.trim() || !responsabile.trim()) {
      setErrore('Inserisci il nome del gruppo e il responsabile.')
      return
    }
    if (!passValidi || !totaleValido || !importo.trim() || !Number.isFinite(Number(importo))) {
      setErrore('Inserisci un numero intero positivo di pass e una spesa valida maggiore di zero.')
      return
    }
    onInvia({ gruppo: gruppo.trim(), responsabile: responsabile.trim(),
      persone: pass, totale: totaleCentesimi / 100 })
  }

  return (
    <form className="modulo-account" onSubmit={invia}>
      <h3>{datiIniziali ? 'Modifica richiesta' : 'Nuova richiesta'}</h3>
      {nomePr && <p className="nota-demo">PR: {nomePr}</p>}
      <div className="modulo-account-campi">
        <label>Nome del gruppo
          <input value={gruppo} onChange={(e) => setGruppo(e.target.value)}
            maxLength={100} required />
        </label>
        <label>Responsabile
          <input value={responsabile} onChange={(e) => setResponsabile(e.target.value)}
            maxLength={100} required />
        </label>
        <label>Numero di pass
          <input type="number" min="1" step="1" value={persone}
            onChange={(e) => setPersone(e.target.value)} required />
        </label>
        <label>Spesa a persona (€)
          <input type="number" min="0" step="0.01"
            value={base === 'persona' ? importo : quota}
            onChange={(e) => cambiaImporto(e.target.value, 'persona')} />
        </label>
        <label>Spesa totale (€)
          <input type="number" min="0" step="0.01"
            value={base === 'totale' ? importo : totale}
            onChange={(e) => cambiaImporto(e.target.value, 'totale')} />
        </label>
      </div>
      <p className="nota-demo">Puoi inserire la quota individuale oppure il totale.
        Se cambi i pass, viene mantenuto l’ultimo importo che hai inserito manualmente.
        La quota calcolata è mostrata con due decimali.</p>
      {errore && <p className="errore-richiesta" role="alert">{errore}</p>}
      <div className="azioni-richiesta">
        <button type="submit" className="pulsante-principale">
          {datiIniziali ? 'Salva modifiche' : 'Invia richiesta'}
        </button>
        <button type="button" className="pulsante-secondario" onClick={onAnnulla}>Annulla</button>
      </div>
    </form>
  )
}

export default NuovaRichiesta
