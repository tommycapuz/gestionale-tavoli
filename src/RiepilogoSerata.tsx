import { useState } from 'react'
import './RiepilogoSerata.css'

type TavoloRiepilogo = {
  id: string
  numero: number
  zona: string
}

type RichiestaRiepilogo = {
  id: string
  gruppo: string
  responsabile: string
  pr: string
  persone: number
  totale: number
  accettata: boolean
}

type Props = {
  serataId: string
  tavoli: TavoloRiepilogo[]
  richieste: Record<string, RichiestaRiepilogo[]>
}

const ordineZone: Record<string, number> = {
  Console: 0,
  Privé: 1,
  Pista: 2,
}

const coloriZone: Record<string, string> = {
  Console: 'FFFFD966',
  Privé: 'FFFFB347',
  Pista: 'FFFF6B6B',
}

function euro(importo: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(importo)
}

function RiepilogoSerata({
  serataId,
  tavoli,
  richieste,
}: Props) {
  const [scaricando, setScaricando] = useState(false)
  const [errore, setErrore] = useState('')

  const righe = tavoli
    .flatMap((tavolo) =>
      (richieste[tavolo.id] ?? [])
        .filter((richiesta) => richiesta.accettata)
        .map((richiesta) => ({
          ...richiesta,
          tavoloId: tavolo.id,
          numero: tavolo.numero,
          zona: tavolo.zona,
        })),
    )
    .sort(
      (prima, seconda) =>
        (ordineZone[prima.zona] ?? 99) -
          (ordineZone[seconda.zona] ?? 99) ||
        prima.numero - seconda.numero,
    )

  const conflitto = tavoli.some(
    (tavolo) =>
      (richieste[tavolo.id] ?? []).filter(
        (richiesta) => richiesta.accettata,
      ).length > 1,
  )

  const totalePass = righe.reduce(
    (somma, riga) => somma + riga.persone,
    0,
  )

  const totaleSpesa = righe.reduce(
    (somma, riga) => somma + Math.round(riga.totale * 100),
    0,
  ) / 100

  async function scaricaExcel() {
    if (scaricando || righe.length === 0 || conflitto) return

    setScaricando(true)
    setErrore('')

    try {
      const { default: ExcelJS } = await import('exceljs')

      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Gestionale Tavoli'
      workbook.created = new Date()

      const foglio = workbook.addWorksheet('Tavoli accettati')

      foglio.columns = [
        { key: 'zona', width: 18 },
        { key: 'numero', width: 14 },
        { key: 'gruppo', width: 32 },
        { key: 'pass', width: 12 },
        { key: 'quota', width: 16 },
        { key: 'totale', width: 20 },
        { key: 'responsabile', width: 22 },
        { key: 'pr', width: 22 },
      ]

      // Titolo principale
      foglio.mergeCells('A1:H1')

      const titolo = foglio.getCell('A1')
      titolo.value = 'RIEPILOGO TAVOLI ACCETTATI'
      titolo.font = {
        name: 'Calibri',
        size: 20,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      }
      titolo.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF302449' },
      }
      titolo.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      }

      foglio.getRow(1).height = 38

      foglio.mergeCells('A2:H2')
      foglio.getCell('A2').value = `Serata: ${serataId}`

      foglio.mergeCells('A3:H3')
      foglio.getCell('A3').value =
        `Esportato il ${new Date().toLocaleString('it-IT')}`

      // Intestazioni verdi
      const intestazioni = [
        'ZONA',
        'N. TAVOLO',
        'NOME TAVOLO',
        'N. PASS',
        '€/PASS',
        'SPESA TOTALE',
        'RESPONSABILE',
        'PR',
      ]

      const rigaIntestazioni = foglio.getRow(5)
      rigaIntestazioni.values = intestazioni
      rigaIntestazioni.height = 30

      rigaIntestazioni.eachCell((cella) => {
        cella.font = {
          name: 'Calibri',
          bold: true,
          color: { argb: 'FFFFFFFF' },
        }

        cella.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF237A47' },
        }

        cella.alignment = {
          vertical: 'middle',
          wrapText: true,
        }

        cella.border = {
          bottom: {
            style: 'medium',
            color: { argb: 'FF000000' },
          },
        }
      })

      // Dati dei tavoli
      righe.forEach((riga, indice) => {
        const numeroRiga = indice + 6
        const rigaExcel = foglio.getRow(numeroRiga)

        const cambiaZona =
          indice > 0 &&
          righe[indice - 1].zona !== riga.zona

        rigaExcel.values = [
          riga.zona,
          riga.numero,
          riga.gruppo,
          riga.persone,
          {
            formula: `F${numeroRiga}/D${numeroRiga}`,
            result: riga.totale / riga.persone,
          },
          riga.totale,
          riga.responsabile,
          riga.pr,
        ]

        rigaExcel.height = 28

        rigaExcel.eachCell((cella) => {
          cella.font = {
            name: 'Calibri',
            size: 11,
            color: { argb: 'FF000000' },
          }

          // Tutte le celle dei dati partono bianche.
          cella.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          }

          cella.alignment = {
            vertical: 'middle',
            wrapText: true,
          }

          // Separatore spesso quando cambia la zona.
          cella.border = {
            top: {
              style: cambiaZona ? 'thick' : 'thin',
              color: {
                argb: cambiaZona ? 'FF000000' : 'FFD9D9D9',
              },
            },
            bottom: {
              style: 'thin',
              color: { argb: 'FFD9D9D9' },
            },
            left: {
              style: 'thin',
              color: { argb: 'FFD9D9D9' },
            },
            right: {
              style: 'thin',
              color: { argb: 'FFD9D9D9' },
            },
          }
        })

        // Colore solo nella cella della zona.
        const cellaZona = rigaExcel.getCell(1)

        cellaZona.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: coloriZone[riga.zona] ?? 'FFFFFFFF',
          },
        }

        cellaZona.font = {
          name: 'Calibri',
          size: 11,
          bold: true,
          color: { argb: 'FF000000' },
        }
      })

      // Totali: celle bianche e testo in grassetto
      const ultimaRigaDati = 5 + righe.length
      const rigaTotali = foglio.getRow(ultimaRigaDati + 1)

      rigaTotali.values = [
        '',
        '',
        'TOTALE',
        {
          formula: `SUM(D6:D${ultimaRigaDati})`,
          result: totalePass,
        },
        '',
        {
          formula: `SUM(F6:F${ultimaRigaDati})`,
          result: totaleSpesa,
        },
        '',
        '',
      ]

      rigaTotali.height = 30

      for (let colonna = 1; colonna <= 8; colonna += 1) {
        const cella = rigaTotali.getCell(colonna)

        cella.font = {
          name: 'Calibri',
          bold: true,
          color: { argb: 'FF000000' },
        }

        cella.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' },
        }

        cella.alignment = {
          vertical: 'middle',
        }

        cella.border = {
          top: {
            style: 'thick',
            color: { argb: 'FF000000' },
          },
        }
      }

      foglio.getColumn(5).numFmt = '"€" #,##0.00'
      foglio.getColumn(6).numFmt = '"€" #,##0.00'

      foglio.views = [
        { state: 'frozen', ySplit: 5 },
      ]

      foglio.autoFilter = {
        from: 'A5',
        to: `H${ultimaRigaDati}`,
      }

      foglio.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const contenuto = new Uint8Array(buffer)

      const file = new Blob([contenuto.buffer], {
        type:
          'application/vnd.openxmlformats-officedocument.' +
          'spreadsheetml.sheet',
      })

      const url = URL.createObjectURL(file)
      const collegamento = document.createElement('a')

      collegamento.href = url
      collegamento.download = `tavoli-${serataId}.xlsx`

      document.body.appendChild(collegamento)
      collegamento.click()
      collegamento.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (problema) {
      console.error('Esportazione non riuscita:', problema)
      setErrore(
        'Non è stato possibile generare il file. Riprova.',
      )
    } finally {
      setScaricando(false)
    }
  }

  return (
    <section className="pannello riepilogo-serata">
      <div className="intestazione-riepilogo">
        <div>
          <h2>Riepilogo serata</h2>
          <p>Solo le proposte attualmente accettate.</p>
        </div>

        <button
          type="button"
          className="pulsante-principale"
          disabled={scaricando || righe.length === 0 || conflitto}
          onClick={scaricaExcel}
        >
          {scaricando ? 'Preparazione…' : 'Scarica Excel'}
        </button>
      </div>

      {conflitto && (
        <p className="errore-richiesta" role="alert">
          Un tavolo ha più proposte accettate.
          Correggi l’assegnazione prima di esportare.
        </p>
      )}

      {righe.length === 0 ? (
        <p>
          Nessun tavolo confermato.
          Accetta una proposta per creare il riepilogo.
        </p>
      ) : (
        <>
          <div
            className="scorrimento-riepilogo"
            tabIndex={0}
            role="region"
            aria-label="Tabella riepilogativa scorrevole"
          >
            <table className="tabella-riepilogo">
              <caption className="didascalia-riepilogo">
                Tavoli accettati · {serataId}
              </caption>

              <thead>
                <tr>
                  <th scope="col">Zona</th>
                  <th scope="col">Tavolo</th>
                  <th scope="col">Gruppo</th>
                  <th scope="col">Pass</th>
                  <th scope="col">€/pass</th>
                  <th scope="col">Totale</th>
                  <th scope="col">Responsabile</th>
                  <th scope="col">PR</th>
                </tr>
              </thead>

              <tbody>
                {righe.map((riga) => (
                  <tr key={`${riga.tavoloId}-${riga.id}`}>
                    <td>{riga.zona}</td>
                    <td>{riga.numero}</td>
                    <td>{riga.gruppo}</td>
                    <td>{riga.persone}</td>
                    <td>{euro(riga.totale / riga.persone)}</td>
                    <td>{euro(riga.totale)}</td>
                    <td>{riga.responsabile}</td>
                    <td>{riga.pr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totali-riepilogo">
            <span>
              Tavoli confermati: <strong>{righe.length}</strong>
            </span>
            <span>
              Pass: <strong>{totalePass}</strong>
            </span>
            <span>
              Spesa prevista: <strong>{euro(totaleSpesa)}</strong>
            </span>
          </div>

          <p className="nota-demo">
            Gli importi rappresentano la spesa prevista delle
            proposte accettate, non gli incassi effettivi.
            La quota individuale è visualizzata con due decimali.
          </p>
        </>
      )}

      {errore && (
        <p className="errore-richiesta" role="alert">
          {errore}
        </p>
      )}
    </section>
  )
}

export default RiepilogoSerata