import * as XLSX from 'xlsx'
import type { Bom } from './types'

type OutputRow = Record<string, string | number>

const HEADERS_BASE = [
  'ID externo',
  'Producto',
  'Referencia',
  'Variante del producto',
  'Cantidad',
]
const HEADERS_PASO_RANGO = ['Paso', 'Rango']
const HEADERS_LINES_INTERNAL_ID = [
  'Líneas de la lista de materiales/ID externo',
  'Líneas de la lista de materiales/Cantidad',
  'Líneas de la lista de materiales/Componente/.id',
  'Líneas de la lista de materiales/Fórmula de cálculo',
]
const HEADERS_LINES_EXTERNAL_ID = [
  'Líneas de la lista de materiales/ID externo',
  'Líneas de la lista de materiales/Cantidad',
  'Líneas de la lista de materiales/Componente/ID (identificación)',
  'Líneas de la lista de materiales/Fórmula de cálculo',
]
const HEADERS_LINES_NAME = [
  'Líneas de la lista de materiales/ID externo',
  'Líneas de la lista de materiales/Cantidad',
  'Líneas de la lista de materiales/Componente',
  'Líneas de la lista de materiales/Fórmula de cálculo',
]

export function exportToExcel(boms: Bom[], usePasoRango = true, componentField: 'internalId' | 'externalId' | 'name' = 'internalId'): Blob {
  const HEADERS_LINES =
    componentField === 'name' ? HEADERS_LINES_NAME :
    componentField === 'externalId' ? HEADERS_LINES_EXTERNAL_ID :
    HEADERS_LINES_INTERNAL_ID
  const componentColHeader =
    componentField === 'name' ? 'Líneas de la lista de materiales/Componente' :
    componentField === 'externalId' ? 'Líneas de la lista de materiales/Componente/ID (identificación)' :
    'Líneas de la lista de materiales/Componente/.id'

  const HEADERS = usePasoRango
    ? [...HEADERS_BASE, ...HEADERS_PASO_RANGO, ...HEADERS_LINES]
    : [...HEADERS_BASE, ...HEADERS_LINES]

  const rows: OutputRow[] = []

  for (const bom of boms) {
    bom.lineas.forEach((linea, i) => {
      const row: OutputRow = {
        'Líneas de la lista de materiales/ID externo': linea.idExterno,
        'Líneas de la lista de materiales/Cantidad': linea.cantidad,
        [componentColHeader]:
          componentField === 'name' ? linea.componente :
          componentField === 'externalId' ? linea.componenteIdExterno :
          linea.componenteId,
        'Líneas de la lista de materiales/Fórmula de cálculo': linea.formula,
      }

      if (i === 0) {
        row['ID externo'] = bom.idExterno
        row['Producto'] = bom.producto
        row['Referencia'] = bom.varianteName      // nombre de la variante
        row['Variante del producto'] = bom.varianteId  // ID numérico Odoo
        row['Cantidad'] = bom.cantidad
        if (usePasoRango) {
          row['Paso'] = bom.paso
          row['Rango'] = bom.rango
        }
      } else {
        row['ID externo'] = ''
        row['Producto'] = ''
        row['Referencia'] = ''
        row['Variante del producto'] = ''
        row['Cantidad'] = ''
      }

      rows.push(row)
    })
  }

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'mrp.bom')

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
