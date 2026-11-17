import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import './App.css'
import './Accesso.css'

type Profilo = {
  id: string
  nome: string
  data_nascita: string
  venerdi: boolean
  sabato: boolean
  ruolo: 'pr' | 'capo' | 'admin'
}

function calcolaEta(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return -1

  const [anno, mese, giorno] = data.split('-').map(Number)
  const nascita = new Date(anno, mese - 1, giorno)
  const oggi = new Date()

  if (
    nascita.getFullYear() !== anno ||
    nascita.getMonth() !== mese - 1 ||
    nascita.getDate() !== giorno ||
    nascita > oggi
  ) {
    return -1
  }

  let eta = oggi.getFullYear() - anno

  if (
    oggi.getMonth() < mese - 1 ||
    (
      oggi.getMonth() === mese - 1 &&
      oggi.getDate() < giorno
    )
  ) {
    eta--
  }

  return eta
}

function messaggioErrore(errore: unknown) {
  if (errore instanceof Error) return errore.message
  return 'Operazione non riuscita. Riprova.'
}

function ProfiloAccount({
  utenteId,
  email,
}: {
  utenteId: string
  email: string
}) {
  const [profilo, setProfilo] = useState<Profilo | null>(null)
  const [errore, setErrore] = useState('')
  const [uscita, setUscita] = useState(false)

  useEffect(() => {
    let attivo = true

    async function caricaProfilo() {
      try {
        const { data, error } = await supabase
          .from('profili')
          .select('id, nome, data_nascita, venerdi, sabato, ruolo')
          .eq('id', utenteId)
          .single()

        if (error) throw error

        if (attivo) {
          setProfilo(data as Profilo)
        }
      } catch (erroreRicevuto) {
        if (attivo) {
          setErrore(
            'Impossibile leggere il profilo: ' +
            messaggioErrore(erroreRicevuto),
          )
        }
      }
    }

    void caricaProfilo()

    return () => {
      attivo = false
    }
  }, [utenteId])

  async function esci() {
    setUscita(true)
    setErrore('')

    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local',
      })

      if (error) throw error
    } catch (erroreRicevuto) {
      setErrore(messaggioErrore(erroreRicevuto))
    } finally {
      setUscita(false)
    }
  }

  const nomiRuoli = {
    pr: 'PR',
    capo: 'Capo',
    admin: 'Amministratore',
  }

  return (
    <section className="pannello accesso-pannello">
      <p className="etichetta">Il tuo account</p>

      <h1>{profilo ? `Ciao, ${profilo.nome}.` : 'Accesso effettuato.'}</h1>

      {errore && (
        <p className="errore-richiesta" role="alert">
          {errore}
        </p>
      )}

      {!profilo && !errore && (
        <p role="status">Caricamento del profilo…</p>
      )}

      {profilo && (
        <>
          <p className="accesso-successo" role="status">
            Collegamento riuscito: il tuo profilo è stato letto
            dal database Supabase.
          </p>

          <dl className="accesso-dati">
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>

            <div>
              <dt>Ruolo</dt>
              <dd>{nomiRuoli[profilo.ruolo]}</dd>
            </div>

            <div>
              <dt>Data di nascita</dt>
              <dd>
                {new Intl.DateTimeFormat('it-IT').format(
                  new Date(`${profilo.data_nascita}T12:00:00`),
                )}
              </dd>
            </div>

            <div>
              <dt>Serate scelte</dt>
              <dd>
                {[
                  profilo.venerdi ? 'Venerdì' : '',
                  profilo.sabato ? 'Sabato' : '',
                ].filter(Boolean).join(', ') || 'Solo eventi speciali'}
              </dd>
            </div>
          </dl>

          <p className="nota-demo">
            Nel prossimo passaggio collegheremo questo account
            alle serate e alla gestione dei tavoli.
          </p>
        </>
      )}

      <button
        type="button"
        className="pulsante-secondario"
        onClick={() => void esci()}
        disabled={uscita}
      >
        {uscita ? 'Uscita…' : 'Esci'}
      </button>
    </section>
  )
}

function Accesso() {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(false)
  const [modalita, setModalita] = useState<'accedi' | 'registrati'>(
    'accedi',
  )

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

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
        eventoRicevuto = true

        if (attivo) {
          setSessione(nuovaSessione)
          setPronto(true)
          setPassword('')
          setConfermaPassword('')
        }
      })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!attivo || eventoRicevuto) return

      if (error) {
        setErrore(error.message)
      } else {
        setSessione(data.session)
      }

      setPronto(true)
    }).catch((erroreRicevuto: unknown) => {
      if (!attivo || eventoRicevuto) return

      setErrore(messaggioErrore(erroreRicevuto))
      setPronto(true)
    })

    return () => {
      attivo = false
      subscription.unsubscribe()
    }
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

    const nuovaEta = calcolaEta(valore)

    if (nuovaEta < 18) setVenerdi(false)
    if (nuovaEta < 16) setSabato(false)
  }

  async function invia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (inCorso) return

    setErrore('')
    setMessaggio('')

    if (registrazione) {
      if (!nome.trim()) {
        setErrore('Inserisci il tuo nome.')
        return
      }

      if (eta < 14) {
        setErrore(
          'Inserisci una data di nascita valida. ' +
          'Devi avere almeno 14 anni.',
        )
        return
      }

      if (password.length < 8) {
        setErrore('Scegli una password di almeno 8 caratteri.')
        return
      }

      if (password !== confermaPassword) {
        setErrore('Le due password non coincidono.')
        return
      }
    }

    setInCorso(true)

    try {
      if (registrazione) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: nome.trim(),
              data_nascita: dataNascita,
              venerdi: eta >= 18 && venerdi,
              sabato: eta >= 16 && sabato,
            },
          },
        })

        if (error) throw error

        setPassword('')
        setConfermaPassword('')

        if (!data.session) {
          setModalita('accedi')
          setMessaggio(
            'Controlla la tua email per confermare la registrazione. ' +
            'Se hai già un account, usa Accedi.',
          )
        }
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

        if (error) {
          if (error.code === 'invalid_credentials') {
            throw new Error('Email o password non corretti.')
          }

          if (error.code === 'email_not_confirmed') {
            throw new Error(
              'Conferma prima il tuo indirizzo email ' +
              'usando il collegamento ricevuto.',
            )
          }

          throw error
        }
      }
    } catch (erroreRicevuto) {
      setErrore(messaggioErrore(erroreRicevuto))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="app">
      <header className="barra-superiore">
        <a className="marchio" href="/">GESTIONALE TAVOLI</a>
      </header>

      <main className="accesso-contenitore">
        {!pronto ? (
          <p role="status">Caricamento…</p>
        ) : sessione ? (
          <ProfiloAccount
            key={sessione.user.id}
            utenteId={sessione.user.id}
            email={sessione.user.email ?? ''}
          />
        ) : (
          <section className="pannello accesso-pannello">
            <p className="etichetta">Gestionale tavoli</p>
            <h1>{registrazione ? 'Crea il tuo account.' : 'Bentornato.'}</h1>

            <div className="accesso-scelta">
              <button
                type="button"
                className={
                  !registrazione
                    ? 'pulsante-principale'
                    : 'pulsante-secondario'
                }
                aria-pressed={!registrazione}
                disabled={inCorso}
                onClick={() => cambiaModalita('accedi')}
              >
                Accedi
              </button>

              <button
                type="button"
                className={
                  registrazione
                    ? 'pulsante-principale'
                    : 'pulsante-secondario'
                }
                aria-pressed={registrazione}
                disabled={inCorso}
                onClick={() => cambiaModalita('registrati')}
              >
                Registrati
              </button>
            </div>

            <form className="accesso-form" onSubmit={invia}>
              <fieldset disabled={inCorso}>
                {registrazione && (
                  <label>
                    Nome e cognome
                    <input
                      type="text"
                      autoComplete="name"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      maxLength={100}
                      required
                    />
                  </label>
                )}

                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(evento) => setEmail(evento.target.value)}
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      registrazione ? 'new-password' : 'current-password'
                    }
                    value={password}
                    onChange={(evento) => setPassword(evento.target.value)}
                    minLength={registrazione ? 8 : undefined}
                    required
                  />
                </label>

                {registrazione && (
                  <>
                    <label>
                      Ripeti la password
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confermaPassword}
                        onChange={(evento) =>
                          setConfermaPassword(evento.target.value)
                        }
                        minLength={8}
                        required
                      />
                    </label>

                    <label>
                      Data di nascita
                      <input
                        type="date"
                        autoComplete="bday"
                        value={dataNascita}
                        onChange={(evento) =>
                          cambiaNascita(evento.target.value)
                        }
                        required
                      />
                    </label>

                    <div className="accesso-serate">
                      <p>Per quali serate lavori?</p>

                      <label>
                        <input
                          type="checkbox"
                          checked={venerdi}
                          disabled={eta < 18}
                          onChange={(evento) =>
                            setVenerdi(evento.target.checked)
                          }
                        />
                        Venerdì · dai 18 anni
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={sabato}
                          disabled={eta < 16}
                          onChange={(evento) =>
                            setSabato(evento.target.checked)
                          }
                        />
                        Sabato · dai 16 anni
                      </label>

                      <p className="nota-demo">
                        Puoi selezionare entrambe le serate.
                        Gli eventi speciali saranno disponibili
                        in base all’età richiesta.
                      </p>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="pulsante-principale"
                >
                  {inCorso
                    ? 'Attendi…'
                    : registrazione
                      ? 'Crea account'
                      : 'Accedi'}
                </button>
              </fieldset>
            </form>

            {errore && (
              <p className="errore-richiesta" role="alert">
                {errore}
              </p>
            )}

            {messaggio && (
              <p className="accesso-successo" role="status">
                {messaggio}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default Accesso