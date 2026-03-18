import * as XLSX from 'xlsx'
import type { Bom } from './types'

type OutputRow = Record<string, string | number>

const HEADERS = [
  'ID externo',
  'Producto',
  'Referencia',
  'Variante del producto',
  'Cantidad',
  'Paso',
  'Rango',
  'Líneas de la lista de materiales/ID externo',
  'Líneas de la lista de materiales/Cantidad',
  'Líneas de la lista de materiales/Componente',
  'Líneas de la lista de materiales/Fórmula de cálculo',
]

export function exportToExcel(boms: Bom[]): Blob {
  const rows: OutputRow[] = []

  for (const bom of boms) {
    bom.lineas.forEach((linea, i) => {
      const row: OutputRow = {
        'Líneas de la lista de materiales/ID externo': linea.idExterno,
        'Líneas de la lista de materiales/Cantidad': linea.cantidad,
        'Líneas de la lista de materiales/Componente': linea.componente,
        'Líneas de la lista de materiales/Fórmula de cálculo': linea.formula,
      }

      if (i === 0) {
        row['ID externo'] = bom.idExterno
        row['Producto'] = bom.producto
        row['Referencia'] = bom.varianteName      // nombre de la variante
        row['Variante del producto'] = bom.varianteId  // ID numérico Odoo
        row['Cantidad'] = bom.cantidad
        row['Paso'] = bom.paso
        row['Rango'] = bom.rango
      } else {
        row['ID externo'] = ''
        row['Producto'] = ''
        row['Referencia'] = ''
        row['Variante del producto'] = ''
        row['Cantidad'] = ''
        row['Paso'] = ''
        row['Rango'] = ''
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
