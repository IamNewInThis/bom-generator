# BoM Generator

Herramienta web para generar listas de materiales (BoM) en formato de importación de **Odoo v18**. Funciona completamente en el navegador — sin servidor, sin carga de datos externa.

## Qué hace

A partir de 4 archivos Excel carga variantes de producto, componentes, centros de trabajo y operaciones, los procesa y genera dos archivos `.xlsx` listos para importar en Odoo:

- `bom_output.xlsx` — hoja `mrp.bom` con todas las BoMs y sus líneas
- `operaciones_output.xlsx` — hoja `mrp.routing.workcenter` con las operaciones por BoM

## Inicio rápido

```bash
npm install
npm run dev       # dev server en localhost:3000
npm run build     # build de producción
npm run lint      # ESLint
```

## Archivos de entrada

| Archivo | Columnas requeridas |
|---|---|
| **Variantes** | `ID (identificación)`, `Nombre`, `Variant Name` |
| **Componentes** | `ID (identificación)`, `Nombre`, `Unidad de medida`, `Fórmula de cálculo` |
| **Centros de trabajo** | `ID (identificación)`, `Centro de trabajo` |
| **Operaciones** | `Operación` |

Cada archivo puede ser un `.xlsx` independiente o una hoja distinta dentro del mismo archivo (se puede elegir la hoja al subir).

## Flujo de uso

1. **Subir archivos** — arrastra o selecciona cada `.xlsx`. Si el archivo tiene múltiples hojas, aparece un selector para elegir cuál usar.
2. **Verificar Paso y Rango** — el panel ámbar muestra los valores extraídos del Variant Name para cada variante. Confirmar antes de generar.
3. **Grupos de componentes variables** *(opcional)* — define qué familias de componentes son "variables" (se selecciona uno por variante según el código en el Variant Name). Ejemplo: placas ZBZ para Baffle, Yeso Cartón para PYC. Los componentes que no pertenecen a ningún grupo se incluyen siempre.
4. **Configurar IDs** — los IDs iniciales se generan aleatoriamente; se pueden ajustar manualmente.
5. **Generar y descargar** — produce los dos archivos listos para importar en Odoo.

## Extracción de Paso y Rango

El Variant Name puede seguir distintos formatos. El parser detecta automáticamente el rango buscando el primer patrón `X-Y` en cualquier segmento:

| Variant Name | Rango | Paso |
|---|---|---|
| `200-240, [ZBZ-41] Cuarzo, 40` | 240 | 40 |
| `ST08, 0-100` | 100 | 0 |
| `ST10, 100-200` | 200 | 0 |

## Grupos de componentes variables

Cada grupo define una familia de componentes donde **solo se incluye uno por variante**, seleccionado según el código extraído del Variant Name.

| Campo | Descripción |
|---|---|
| **Componentes del grupo** | Prefijo del nombre del componente (ej: `Yeso Cartón`, `ZBZ-`) |
| **Extraer código de** | `Entre corchetes [CÓDIGO]` o `Primer segmento antes de coma` |
| **Modo de coincidencia** | `Prefijo exacto` o `Contiene (normalizado)` — el modo normalizado ignora espacios, puntos, tildes y ceros iniciales (`ST08` = `ST 8mm`) |

El panel incluye una vista previa en tiempo real mostrando qué componente se selecciona para cada variante, y una lista de los **componentes fijos** (siempre incluidos en todas las BoMs).

**Regla ZBZ incluida por defecto** — las placas `ZBZ-XX` del Baffle se seleccionan automáticamente por el código `[ZBZ-XX]` en el Variant Name sin necesidad de configuración adicional.

## IDs de salida

- **BoM IDs**: `mrp_{id}`, `mrp_{id+1}`, … — el ID inicial se genera aleatoriamente entre 1 y 1.000.000 al cargar la app.
- **Line IDs**: `mrp_bom_line_{id}`, … — mismo mecanismo, contador global incremental.
- Ambos son editables manualmente antes de generar.

## Stack técnico

- **Next.js 16** con Turbopack (App Router)
- **Tailwind CSS v3**
- **SheetJS (`xlsx` 0.18.5)** — lectura y escritura de Excel, 100% client-side
- **`@base-ui/react`** — componente Button

## Autor

**Nicolás Ruiz** — [nruizz@proton.me](mailto:nruizz@proton.me)
