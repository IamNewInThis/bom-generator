import type { InputData, Bom, BomLine, Componente } from './types'
import { evaluateFormula } from './formula'

/**
 * Extrae el código de placa del Variant Name.
 * Ejemplo: "200-240, [ZBZ-41] Cuarzo, 40" → "ZBZ-41"
 */
function extractPlateCode(varianteName: string): string | null {
  const match = varianteName.match(/\[([A-Z]+-\d+)\]/)
  return match ? match[1] : null
}

/**
 * Determina si un componente es una placa (ZBZ-XX).
 * Las placas se matchean por variante; los demás se incluyen siempre.
 */
function isPlateComponent(nombre: string): boolean {
  return /^ZBZ-\d+/i.test(nombre)
}

function selectComponentes(
  componentes: Componente[],
  varianteName: string
): Componente[] {
  const plateCode = extractPlateCode(varianteName)

  return componentes.filter((c) => {
    if (!isPlateComponent(c.nombre)) return true // siempre incluir no-placas
    if (!plateCode) return false
    // Match exacto: el nombre del componente empieza con el código + espacio
    return new RegExp(`^${plateCode}(\\s|$)`, 'i').test(c.nombre)
  })
}

export function processBoms(
  data: InputData,
  startId: number = 30000,
  startLineId: number = 60000
): Bom[] {
  let bomId = startId
  let lineId = startLineId

  return data.variantes.map((variante) => {
    const componentesParaVariante = selectComponentes(
      data.componentes,
      variante.varianteName
    )

    const lineas: BomLine[] = componentesParaVariante.map((componente) => {
      const cantidad = evaluateFormula(componente.formula, {
        rango: variante.rango,
        paso_felt: variante.paso,
        product_product_qty: variante.cantidad,
      })
      return {
        idExterno: `mrp_bom_line_${lineId++}`,
        cantidad,
        componente: componente.nombre,
        formula: componente.formula,
      }
    })

    return {
      idExterno: `mrp_${bomId++}`,
      producto: variante.producto,
      varianteName: variante.varianteName,
      varianteId: variante.varianteId,
      cantidad: variante.cantidad,
      paso: variante.paso,
      rango: variante.rango,
      lineas,
    }
  })
}
