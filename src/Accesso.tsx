import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import App from './App'
import type { Profilo } from './profilo'
import { etaAllaData } from './profilo'
import './App.css'
import './Accesso.css'
import './InterfacciaAccount.css'

function oggiLocale() {
  const oggi = new Date()
  return `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`
}

function calcolaEta(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return -1
  const [anno, mese, giorno] = data.split('-').map(Number)
  const nascita = new Date(`${data}T12:00:00`)
  if (Number.isNaN(nascita.getTime()) ||
      nascita.getFullYear() !== anno ||
      nascita.getMonth() !== mese - 1 ||
      nascita.getDate() !== giorno || data > oggiLocale()) return -1
  return etaAllaData(data, oggiLocale())
}

function testoErrore(errore: unknown) {
  return errore instanceof Error ? errore.message : 'Operazione non riuscita. Riprova.'
}

function profiloValido(valore: unknown): valore is Profilo {
  if (!valore || typeof valore !== 'object') return false
  const p = valore as Record<string, unknown>
  return typeof p.id === 'string' && typeof p.nome === 'string' &&
    typeof p.data_nascita === 'string' &&
    typeof p.venerdi === 'boolean' && typeof p.sabato === 'boolean' &&
    (p.ruolo === 'pr' || p.ruolo === 'capo' || p.ruolo === 'admin')
}

function GestionaleAutenticato({ utenteId }: { utenteId: string }) {
  const [profilo, setProfilo] = useState<Profilo | null>(null)
  const [erroreProfilo, setErroreProfilo] = useState('')
  const [erroreUscita, setErroreUscita] = useState('')
  const [uscita, setUscita] = useState(false)
  const [tentativo, setTentativo] = useState(0)

  useEffect(() => {
    let attivo = true
    async function carica() {
      try {
        const { data, error } = await supabase.from('profili')
          .select('id, nome, data_nascita, venerdi, sabato, ruolo')
          .eq('id', utenteId).single()
        if (error) throw error
        if (!profiloValido(data)) throw new Error('Il profilo ricevuto non è valido.')
        if (attivo) setProfilo(data)
      } catch (errore) {
        if (attivo) setErroreProfilo(testoErrore(errore))
      }
    }
    void carica()
    return () => { attivo = false }
  }, [utenteId, tentativo])

  async function esci() {
    setUscita(true)
    setErroreUscita('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch (errore) {
      setErroreUscita(testoErrore(errore))
    } finally {
      setUscita(false)
    }
  }

  if (profilo) {
    return <App profilo={profilo} onEsci={esci}
      uscita={uscita} erroreUscita={erroreUscita} />
  }

  return (
    <div className="app">
      <main className="accesso-contenitore">
        <section className="pannello accesso-pannello">
          <h1>{erroreProfilo ? 'Profilo non disponibile.' : 'Caricamento…'}</h1>
          {erroreProfilo && <p role="alert" className="errore-richiesta">{erroreProfilo}</p>}
          {erroreUscita && <p role="alert" className="errore-richiesta">{erroreUscita}</p>}
          <div className="azioni-richiesta">
            {erroreProfilo && (
              <button type="button" className="pulsante-principale"
                onClick={() => { setErroreProfilo(''); setTentativo((n) => n + 1) }}>
                Riprova
              </button>
            )}
            <button type="button" className="pulsante-secondario"
              disabled={uscita} onClick={() => void esci()}>
              {uscita ? 'Uscita…' : 'Esci'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function Accesso() {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(false)
  const [modalita, setModalita] = useState<'accedi' | 'registrati'>('accedi')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [dataNascita, setDataNascita] = useState('')
  const [venerdi, setVenerdi] = useState(false)
  const [sabato, setSabato] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const registrazione = modalita === 'registrati'
  const eta = calcolaEta(dataNascita)

  useEffect(() => {
    let attivo = true
    let eventoRicevuto = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuova) => {
      eventoRicevuto = true
      if (!attivo) return
      setSessione(nuova)
      setPronto(true)
      setPassword('')
      setConfermaPassword('')
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!attivo || eventoRicevuto) return
      if (error) setErrore(error.message)
      else setSessione(data.session)
      setPronto(true)
    }).catch((errore: unknown) => {
      if (!attivo || eventoRicevuto) return
      setErrore(testoErrore(errore))
      setPronto(true)
    })
    return () => { attivo = false; subscription.unsubscribe() }
  }, [])

  function cambiaModalita(nuova: 'accedi' | 'registrati') {
    setModalita(nuova)
    setErrore('')
    setMessaggio('')
    setPassword('')
    setConfermaPassword('')
  }

  function cambiaNascita(valore: string) {
    setDataNascita(valore)
    if (calcolaEta(valore) < 18) setVenerdi(false)
    if (calcolaEta(valore) < 16) setSabato(false)
  }

  async function invia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (inCorso) return
    setErrore('')
    setMessaggio('')
    if (registrazione) {
      if (!nome.trim()) { setErrore('Inserisci il tuo nome.'); return }
      if (eta < 14) { setErrore('Inserisci una data valida. Devi avere almeno 14 anni.'); return }
      if (password.length < 8) { setErrore('Scegli una password di almeno 8 caratteri.'); return }
      if (password !== confermaPassword) { setErrore('Le password non coincidono.'); return }
    }
    setInCorso(true)
    try {
      if (registrazione) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome: nome.trim(), data_nascita: dataNascita,
              venerdi: eta >= 18 && venerdi, sabato: eta >= 16 && sabato },
          },
        })
        if (error) throw error
        setPassword('')
        setConfermaPassword('')
        if (!data.session) {
          setModalita('accedi')
          setMessaggio('Controlla la tua email per confermare la registrazione. Se hai già un account, usa Accedi.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error?.code === 'invalid_credentials') throw new Error('Email o password non corretti.')
        if (error?.code === 'email_not_confirmed') throw new Error('Conferma prima il tuo indirizzo email.')
        if (error) throw error
      }
    } catch (errore) {
      setErrore(testoErrore(errore))
    } finally { setInCorso(false) }
  }

  if (sessione && pronto) {
    return <GestionaleAutenticato key={sessione.user.id} utenteId={sessione.user.id} />
  }

  return (
    <div className="app">
      <header className="barra-superiore">
        <a className="marchio" href="/">GESTIONALE TAVOLI</a>
      </header>
      <main className="accesso-contenitore">
        {!pronto ? <p role="status">Caricamento…</p> : (
          <section className="pannello accesso-pannello">
            <p className="etichetta">Gestionale tavoli</p>
            <h1>{registrazione ? 'Crea il tuo account.' : 'Bentornato.'}</h1>
            <div className="accesso-scelta">
              <button type="button" disabled={inCorso} aria-pressed={!registrazione}
                className={!registrazione ? 'pulsante-principale' : 'pulsante-secondario'}
                onClick={() => cambiaModalita('accedi')}>Accedi</button>
              <button type="button" disabled={inCorso} aria-pressed={registrazione}
                className={registrazione ? 'pulsante-principale' : 'pulsante-secondario'}
                onClick={() => cambiaModalita('registrati')}>Registrati</button>
            </div>
            <form className="accesso-form" onSubmit={invia}>
              <fieldset disabled={inCorso}>
                {registrazione && <label>Nome e cognome
                  <input type="text" autoComplete="name" value={nome} maxLength={100} required
                    onChange={(e) => setNome(e.target.value)} />
                </label>}
                <label>Email
                  <input type="email" autoComplete="email" value={email} required
                    onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>Password
                  <input type="password" value={password} required
                    autoComplete={registrazione ? 'new-password' : 'current-password'}
                    minLength={registrazione ? 8 : undefined}
                    onChange={(e) => setPassword(e.target.value)} />
                </label>
                {registrazione && <>
                  <label>Ripeti la password
                    <input type="password" autoComplete="new-password" value={confermaPassword}
                      minLength={8} required onChange={(e) => setConfermaPassword(e.target.value)} />
                  </label>
                  <label>Data di nascita
                    <input type="date" autoComplete="bday" value={dataNascita} required
                      onChange={(e) => cambiaNascita(e.target.value)} />
                  </label>
                  <div className="accesso-serate">
                    <p>Per quali serate lavori?</p>
                    <label><input type="checkbox" checked={venerdi} disabled={eta < 18}
                      onChange={(e) => setVenerdi(e.target.checked)} />Venerdì · dai 18 anni</label>
                    <label><input type="checkbox" checked={sabato} disabled={eta < 16}
                      onChange={(e) => setSabato(e.target.checked)} />Sabato · dai 16 anni</label>
                    <p className="nota-demo">Puoi selezionare entrambe le serate.
                      Gli eventi speciali saranno disponibili in base all’età richiesta.</p>
                  </div>
                </>}
                <button type="submit" className="pulsante-principale">
                  {inCorso ? 'Attendi…' : registrazione ? 'Crea account' : 'Accedi'}
                </button>
              </fieldset>
            </form>
            {errore && <p className="errore-richiesta" role="alert">{errore}</p>}
            {messaggio && <p className="accesso-successo" role="status">{messaggio}</p>}
          </section>
        )}
      </main>
    </div>
  )
}

export default Accesso
