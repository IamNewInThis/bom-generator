export interface Variante {
  varianteId: string      // ID numérico de Odoo (product.product), ej: 7961
  varianteName: string    // Nombre/descripción de la variante, ej: "200-240, [ZBZ-41] Cuarzo, 40"
  producto: string        // Nombre del producto plantilla
  cantidad: number        // product_product_qty
  paso: number            // paso_felt
  rango: number
}

export interface Componente {
  id: string           // ID (identificación) de Odoo
  nombre: string
  unidadMedida: string
  formula: string
}

export interface CentroTrabajo {
  id: number
  nombre: string
}

export interface Operacion {
  nombre: string
}

export interface ComponentRule {
  id: string
  label: string
  /** Prefijo que identifica los componentes "variables" de este grupo (ej: "ZBZ-" o "Yeso Cartón") */
  componentPrefix: string
  /** Cómo extraer el código del Variant Name */
  extractMode: 'brackets' | 'firstSegment'
  /** Cómo comparar el código con el nombre del componente */
  matchMode: 'exactPrefix' | 'normalizedContains'
}

export interface VarianteConCoste {
  id: string
  nombre: string
  varianteName: string
  coste: number
}

export interface InputData {
  variantes: Variante[]
  componentes: Componente[]
  centrosTrabajo: CentroTrabajo[]
}

export interface BomLine {
  idExterno: string
  cantidad: number
  componenteId: string
  componente: string
  formula: string
}

export interface Bom {
  idExterno: string
  producto: string
  varianteName: string   // → columna "Referencia" en Odoo
  varianteId: string     // → columna "Variante del producto" en Odoo
  cantidad: number
  paso: number
  rango: number
  lineas: BomLine[]
}
