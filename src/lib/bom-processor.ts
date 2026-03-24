import type { InputData, Bom, BomLine, Componente, ComponentRule } from './types'
import { evaluateFormula } from './formula'

/**
 * Normaliza un string para comparación tolerante:
 * - Elimina acentos/diacríticos (ó→o, ñ→n, etc.)
 * - Minúsculas, quita espacios/puntos/guiones
 * - Quita ceros iniciales precedidos por letra: ST08→st8, RF12.5→rf125
 */
function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // ó→o, ñ→n, etc.
    .toLowerCase()
    .replace(/[\s.\-]/g, '')
    .replace(/([a-z])0+(\d)/g, '$1$2')  // ST08→ST8 (solo ceros tras letra)
}

/** Compara prefijos ignorando acentos y mayúsculas */
function startsWithDeaccent(s: string, prefix: string): boolean {
  const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return norm(s).startsWith(norm(prefix))
}

function extractCode(varianteName: string, mode: ComponentRule['extractMode']): string | null {
  if (mode === 'brackets') {
    const m = varianteName.match(/\[([^\]]+)\]/)
    return m ? m[1].trim() : null
  }
  // firstSegment: todo lo que hay antes de la primera coma
  const m = varianteName.match(/^([^,]+)/)
  return m ? m[1].trim() : null
}

function matchesCode(
  componentName: string,
  code: string,
  mode: ComponentRule['matchMode']
): boolean {
  if (mode === 'exactPrefix') {
    // El nombre del componente empieza con el código (+ espacio o fin)
    return new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(componentName)
  }
  // normalizedContains: comparación tolerante a espacios, puntos y ceros
  return normalize(componentName).includes(normalize(code))
}

function selectComponentes(
  componentes: Componente[],
  varianteName: string,
  rules: ComponentRule[]
): Componente[] {
  // Solo aplicar reglas que tengan prefijo configurado
  const activeRules = rules.filter((r) => r.componentPrefix.trim() !== '')

  return componentes.filter((c) => {
    for (const rule of activeRules) {
      if (!startsWithDeaccent(c.nombre, rule.componentPrefix)) continue

      // Este componente pertenece al grupo — intentar extraer código y comparar
      const code = extractCode(varianteName, rule.extractMode)
      if (!code) return false
      return matchesCode(c.nombre, code, rule.matchMode)
    }
    return true // componente fijo, siempre se incluye
  })
}

export const DEFAULT_COMPONENT_RULES: ComponentRule[] = [
  {
    id: 'zbz',
    label: 'Placas ZBZ',
    componentPrefix: 'ZBZ-',
    extractMode: 'brackets',
    matchMode: 'exactPrefix',
  },
]

export function processBoms(
  data: InputData,
  startId: number = 30000,
  startLineId: number = 60000,
  componentRules: ComponentRule[] = DEFAULT_COMPONENT_RULES
): Bom[] {
  let bomId = startId
  let lineId = startLineId

  return data.variantes.map((variante) => {
    const componentesParaVariante = selectComponentes(
      data.componentes,
      variante.varianteName,
      componentRules
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
        componenteId: componente.id,
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
