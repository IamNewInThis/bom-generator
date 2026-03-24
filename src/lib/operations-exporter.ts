import * as XLSX from 'xlsx'
import type { Bom, CentroTrabajo, Operacion } from './types'

type OutputRow = Record<string, string | number>

const HEADERS = [
  'Centro de trabajo/ID (identificación)',
  'Lista de materiales/ID externo',
  'Operación',
  'Duración manual',
]

const DURACION_MANUAL: Record<string, number> = {
  'Felt Corte': 4,
  'Felt Post Procesado (Lineal)': 10,
  'Felt Packing (Lineal)': 10,
}

export function exportOperationsToExcel(
  boms: Bom[],
  centros: CentroTrabajo[],
  operaciones: Operacion[]
): Blob {
  const rows: OutputRow[] = []

  for (const bom of boms) {
    // Pair by position: centros[i] ↔ operaciones[i]
    const count = Math.min(centros.length, operaciones.length)
    for (let i = 0; i < count; i++) {
      const nombre = operaciones[i].nombre
      rows.push({
        'Centro de trabajo/ID (identificación)': centros[i].id,
        'Lista de materiales/ID externo': `__import__.${bom.idExterno}`,
        'Operación': nombre,
        'Duración manual': DURACION_MANUAL[nombre] ?? '',
      })
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'mrp.routing.workcenter')

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
