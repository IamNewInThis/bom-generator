# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js 16 + Turbopack) at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

There are no tests.

## Stack

- **Next.js 16** with Turbopack (App Router, `'use client'` for all interactive pages)
- **Tailwind CSS v3** — CSS variables defined in `globals.css` using OKLCH, mapped in `tailwind.config.ts`
- **SheetJS (`xlsx` 0.18.5)** — used for both reading and writing Excel files, runs entirely client-side
- **`@base-ui/react`** — used for the `Button` primitive in `src/components/ui/button.tsx`

## Architecture

The app is a fully client-side ETL tool (no API routes). All Excel parsing, formula evaluation, and file generation runs in the browser.

### Data flow

```
3 Excel uploads → parse → processBoms() → exportToExcel() + exportOperationsToExcel()
```

1. User uploads 3 separate `.xlsx` files (Variantes, Componentes, Centros de trabajo)
2. Each is parsed by a dedicated function in `src/lib/excel-parser.ts` reading the **first sheet** of each file
3. `processBoms()` in `src/lib/bom-processor.ts` matches components to variants and evaluates formulas
4. Two output Excels are generated: `bom_output.xlsx` and `operaciones_output.xlsx`

### Key domain logic

**Variant → Component matching** (`bom-processor.ts → selectComponentes`):
- Components whose name starts with `ZBZ-\d+` are "plate" components — only ONE is included per variant
- The plate is selected by extracting `[ZBZ-XX]` from the Variant Name (e.g. `"200-240, [ZBZ-41] Cuarzo, 40"` → matches `ZBZ-41 1220x2440x9mm ...`)
- All non-plate components (Adhesivo, Kit de suspensión, etc.) are always included

**Paso/Rango parsing** (`excel-parser.ts → parsePasoRangoFromName`):
- Extracted from Variant Name when not present as explicit columns
- Pattern: `"{min}-{rango}, [...], {paso}"` → Rango = max of first range segment, Paso = last number

**Formula evaluation** (`src/lib/formula.ts`):
- Strips `qty=` prefix, normalizes comma decimals to dots, evaluates via `Function` constructor
- Variables: `rango`, `paso_felt`, `product_product_qty`

### Expected input column names

| File | Required columns |
|------|-----------------|
| Variantes | `ID (identificación)`, `Nombre`, `Variant Name` |
| Componentes | `ID (identificación)`, `Nombre`, `Unidad de medida`, `Formula` |
| Centros de trabajo | `ID`, `Centro de trabajo`, `Operación` |

### Output format

- **BoM Excel** (`mrp.bom` sheet): Odoo v18 import format for `mrp.bom`. First line of each BoM has all BOM-level fields; subsequent lines leave those blank.
- **Operations Excel** (`mrp.routing.workcenter` sheet): One row per BoM × work center. BOM ID prefixed with `__import__.` (e.g. `__import__.mrp_30411`).

### IDs

- BoM IDs: `mrp_{startId}`, `mrp_{startId+1}`, ... (configurable, default 30000)
- Line IDs: `mrp_bom_line_{startLineId}`, ... (configurable, default 60000, increments globally across all BoMs)

## CSS / Tailwind notes

- `@import "tw-animate-css"` was removed — not compatible with Turbopack
- `@import "shadcn/tailwind.css"` was removed — uses Tailwind v4 syntax incompatible with v3
- `outline-ring/50` opacity modifier doesn't work with CSS variable colors in Tailwind v3; replaced with `color-mix()`
- Fonts: local `GeistVF.woff` loaded via `next/font/local` with variable `--font-sans`
