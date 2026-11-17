export type Profilo = {
  id: string
  nome: string
  data_nascita: string
  venerdi: boolean
  sabato: boolean
  ruolo: 'pr' | 'capo' | 'admin'
}

export function etaAllaData(nascita: string, data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascita) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data)) return -1
  const [annoNascita, meseNascita, giornoNascita] = nascita.split('-').map(Number)
  const [anno, mese, giorno] = data.split('-').map(Number)
  let eta = anno - annoNascita
  if (mese < meseNascita || (mese === meseNascita && giorno < giornoNascita)) eta--
  return eta
}
