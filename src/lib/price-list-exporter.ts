import * as XLSX from 'xlsx'
import type { VarianteConCoste } from './types'

export function exportPriceList(variantes: VarianteConCoste[], margin: number, tarifaId: number): Blob {
  const factor = 1 + margin / 100
  const rows = variantes.map((v) => ({
    'Tarifa/ID (identificación)': tarifaId,
    'Precio fijo': Math.round(v.coste * factor * 100) / 100,
    'Variante/ID (identificación)': v.id,
  }))

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Tarifa/ID (identificación)', 'Precio fijo', 'Variante/ID (identificación)'],
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'product.pricelist.item')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
