import * as XLSX from 'xlsx'
import type { Variante, Componente, CentroTrabajo, Operacion } from './types'

type Row = Record<string, unknown>

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}
function num(v: unknown): number {
  const n = Number(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function firstSheet(buffer: ArrayBuffer): Row[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('El archivo está vacío')
  return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName])
}

/**
 * Extrae Paso y Rango del Variant Name.
 * Patrón: "{min}-{rango}, [...] Nombre, {paso}"
 * Ejemplo: "200-240, [ZBZ-41] Cuarzo, 40" → rango=240, paso=40
 */
function parsePasoRangoFromName(varianteName: string): { paso: number; rango: number } {
  const parts = varianteName.split(',')

  // Rango: segundo número del primer segmento "X-Y"
  const firstPart = parts[0]?.trim() ?? ''
  const rangeMatch = firstPart.match(/\d+[\.,]?\d*-(\d+[\.,]?\d*)/)
  const rango = rangeMatch ? num(rangeMatch[1]) : num(firstPart.match(/\d+/)?.[0] ?? '0')

  // Paso: el número del último segmento
  const lastPart = parts[parts.length - 1]?.trim() ?? ''
  const paso = num(lastPart.match(/\d+[\.,]?\d*/)?.[0] ?? '0')

  return { paso, rango }
}

export function parseVariantes(buffer: ArrayBuffer): Variante[] {
  const rows = firstSheet(buffer)
  if (rows.length === 0) throw new Error('El archivo de variantes no tiene filas')
  return rows.map((row) => {
    const varianteId = str(
      row['ID (identificación)'] ??
      row['ID (identificacion)'] ??
      row['Variante del producto'] ??
      row['ID variante'] ??
      row['ID'] ??
      row['id']
    )
    const varianteName = str(
      row['Variant Name'] ??
      row['Nombre de variante'] ??
      row['Nombre variante'] ??
      row['Referencia'] ??
      row['Nombre'] ??
      row['display_name'] ??
      row['Variante']
    )
    const producto = str(
      row['Producto'] ??
      row['producto'] ??
      row['Nombre'] ??
      row['nombre'] ??
      row['Plantilla'] ??
      row['Product Template']
    )

    // Paso y Rango: desde columnas si existen, sino se parsean del Variant Name
    const hasPaso = row['Paso'] != null || row['paso'] != null
    const hasRango = row['Rango'] != null || row['rango'] != null
    const parsed = (!hasPaso || !hasRango) ? parsePasoRangoFromName(varianteName) : { paso: 0, rango: 0 }

    const paso = hasPaso ? num(row['Paso'] ?? row['paso']) : parsed.paso
    const rango = hasRango ? num(row['Rango'] ?? row['rango']) : parsed.rango
    const cantidad = num(row['Cantidad'] ?? row['cantidad'] ?? row['Qty'] ?? row['qty'] ?? 1)

    return { varianteId, varianteName, producto, cantidad, paso, rango }
  })
}

export function parseComponentes(buffer: ArrayBuffer): Componente[] {
  const rows = firstSheet(buffer)
  if (rows.length === 0) throw new Error('El archivo de componentes no tiene filas')
  return rows.map((row) => ({
    id: str(
      row['ID (identificación)'] ??
      row['ID (identificacion)'] ??
      row['ID'] ??
      row['id']
    ),
    nombre: str(row['Nombre'] ?? row['nombre']),
    unidadMedida: str(
      row['Unidad de medida'] ?? row['UdM'] ?? row['udm'] ?? row['Unidad']
    ),
    formula: str(
      row['Fórmula de cálculo'] ??
        row['Formula de calculo'] ??
        row['Fórmula'] ??
        row['Formula'] ??
        row['formula'] ??
        row['Qty Formula'] ??
        row['qty_formula']
    ),
  }))
}

export function parseCentrosTrabajo(buffer: ArrayBuffer): CentroTrabajo[] {
  const rows = firstSheet(buffer)
  if (rows.length === 0) throw new Error('El archivo de centros de trabajo no tiene filas')
  return rows.map((row) => ({
    id: num(
      row['ID (identificación)'] ??
      row['ID (identificacion)'] ??
      row['ID'] ??
      row['Id'] ??
      row['id']
    ),
    nombre: str(row['Centro de trabajo'] ?? row['Nombre'] ?? row['nombre']),
  }))
}

export function parseOperaciones(buffer: ArrayBuffer): Operacion[] {
  const rows = firstSheet(buffer)
  if (rows.length === 0) throw new Error('El archivo de operaciones no tiene filas')
  return rows.map((row) => ({
    nombre: str(
      row['Operación'] ??
      row['Operacion'] ??
      row['Operation'] ??
      row['operacion'] ??
      row['Nombre'] ??
      row['nombre']
    ),
  }))
}
