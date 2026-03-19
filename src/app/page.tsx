'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { UploadZone } from '@/components/upload-zone'
import { DataPreview } from '@/components/data-preview'
import { Button } from '@/components/ui/button'
import { parseVariantes, parseComponentes, parseCentrosTrabajo, parseOperaciones, getSheetNames } from '@/lib/excel-parser'
import { processBoms, DEFAULT_COMPONENT_RULES } from '@/lib/bom-processor'
import { exportToExcel } from '@/lib/excel-exporter'
import { exportOperationsToExcel } from '@/lib/operations-exporter'
import type { Variante, Componente, CentroTrabajo, Operacion, Bom, ComponentRule } from '@/lib/types'

interface FileState {
  name: string
  error?: string
  buffer?: ArrayBuffer
  sheetNames?: string[]
  selectedSheet?: string
}

export default function Home() {
  const [variantes, setVariantes] = useState<Variante[] | null>(null)
  const [componentes, setComponentes] = useState<Componente[] | null>(null)
  const [centros, setCentros] = useState<CentroTrabajo[] | null>(null)
  const [operaciones, setOperaciones] = useState<Operacion[] | null>(null)

  const [variantesFile, setVariantesFile] = useState<FileState | null>(null)
  const [componentesFile, setComponentesFile] = useState<FileState | null>(null)
  const [centrosFile, setCentrosFile] = useState<FileState | null>(null)
  const [operacionesFile, setOperacionesFile] = useState<FileState | null>(null)

  const [variantesConfirmed, setVariantesConfirmed] = useState(false)
  const [usePasoRango, setUsePasoRango] = useState(true)
  const [componentRules, setComponentRules] = useState<ComponentRule[]>(DEFAULT_COMPONENT_RULES)

  const [startId, setStartId] = useState(() => Math.floor(Math.random() * 1_000_000) + 1)
  const [startLineId, setStartLineId] = useState(() => Math.floor(Math.random() * 1_000_000) + 1)
  const [boms, setBoms] = useState<Bom[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadOpsUrl, setDownloadOpsUrl] = useState<string | null>(null)

  async function handleUpload<T>(
    file: File,
    parser: (buf: ArrayBuffer, sheet?: string) => T,
    onSuccess: (data: T) => void,
    setFileState: (s: FileState) => void
  ) {
    if (!file.name.endsWith('.xlsx')) {
      setFileState({ name: file.name, error: 'El archivo debe ser un .xlsx' })
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const sheetNames = getSheetNames(buffer)
      if (sheetNames.length > 1) {
        setFileState({ name: file.name, buffer, sheetNames })
      } else {
        const data = parser(buffer, sheetNames[0])
        onSuccess(data)
        setFileState({ name: file.name })
      }
    } catch (e) {
      setFileState({
        name: file.name,
        error: e instanceof Error ? e.message : 'Error al leer el archivo',
      })
    }
    // Reset output when any input changes
    setDownloadUrl(null)
    setDownloadOpsUrl(null)
    setBoms([])
  }

  function handleSheetSelect<T>(
    sheet: string,
    fileState: FileState,
    parser: (buf: ArrayBuffer, sheet: string) => T,
    onSuccess: (data: T) => void,
    setFileState: (s: FileState) => void
  ) {
    if (!fileState.buffer) return
    try {
      const data = parser(fileState.buffer, sheet)
      onSuccess(data)
      setFileState({ ...fileState, selectedSheet: sheet, error: undefined })
    } catch (e) {
      setFileState({
        ...fileState,
        selectedSheet: sheet,
        error: e instanceof Error ? e.message : 'Error al leer la hoja',
      })
    }
    setDownloadUrl(null)
    setDownloadOpsUrl(null)
    setBoms([])
  }

  const allLoaded = variantes !== null && componentes !== null

  function handleGenerate() {
    if (!variantes || !componentes) return
    const generated = processBoms({ variantes, componentes, centrosTrabajo: centros ?? [] }, startId, startLineId, componentRules)

    const bomBlob = exportToExcel(generated)
    setBoms(generated)
    setDownloadUrl(URL.createObjectURL(bomBlob))

    if (centros !== null) {
      const opsBlob = exportOperationsToExcel(generated, centros, operaciones ?? [])
      setDownloadOpsUrl(URL.createObjectURL(opsBlob))
    } else {
      setDownloadOpsUrl(null)
    }
  }

  const totalLines = boms.reduce((acc, b) => acc + b.lineas.length, 0)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            BoM Generator
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Genera listas de materiales para Odoo v18
          </p>
        </div>

        <div className="space-y-8">
          {/* Upload section */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-medium text-foreground">Archivos de entrada</h2>

            <div>
              <UploadZone
                label="Variantes"
                description="Columnas: ID (identificación), Nombre, Variant Name"
                fileName={variantesFile?.name}
                error={variantesFile?.error}
                onFile={(f) =>
                  handleUpload(f, parseVariantes, (d) => { setVariantes(d); setVariantesConfirmed(false) }, setVariantesFile)
                }
              />
              {variantesFile?.sheetNames && (
                <SheetSelector
                  sheets={variantesFile.sheetNames}
                  selected={variantesFile.selectedSheet}
                  onSelect={(s) => handleSheetSelect(s, variantesFile, parseVariantes, (d) => { setVariantes(d); setVariantesConfirmed(false) }, setVariantesFile)}
                />
              )}
              {variantes && (
                <>
                  <DataPreview
                    columns={[
                      { key: 'varianteId', label: 'ID' },
                      { key: 'producto', label: 'Nombre' },
                      { key: 'varianteName', label: 'Variant Name' },
                      { key: 'paso', label: 'Paso' },
                      { key: 'rango', label: 'Rango' },
                    ]}
                    rows={variantes as unknown as Record<string, unknown>[]}
                  />
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={usePasoRango}
                      onChange={(e) => { setUsePasoRango(e.target.checked); setVariantesConfirmed(false) }}
                      className="rounded border-border accent-primary"
                    />
                    Usar Paso y Rango
                  </label>
                  {usePasoRango && (
                    <PasoRangoVerification
                      variantes={variantes}
                      confirmed={variantesConfirmed}
                      onConfirm={() => setVariantesConfirmed(true)}
                      onReset={() => setVariantesConfirmed(false)}
                    />
                  )}
                </>
              )}
            </div>

            <div>
              <UploadZone
                label="Componentes"
                description="Columnas: Nombre, Unidad de medida, Formula"
                fileName={componentesFile?.name}
                error={componentesFile?.error}
                onFile={(f) =>
                  handleUpload(f, parseComponentes, setComponentes, setComponentesFile)
                }
              />
              {componentesFile?.sheetNames && (
                <SheetSelector
                  sheets={componentesFile.sheetNames}
                  selected={componentesFile.selectedSheet}
                  onSelect={(s) => handleSheetSelect(s, componentesFile, parseComponentes, setComponentes, setComponentesFile)}
                />
              )}
              {componentes && (
                <DataPreview
                  columns={[
                    { key: 'nombre', label: 'Nombre' },
                    { key: 'unidadMedida', label: 'Unidad' },
                    { key: 'formula', label: 'Fórmula' },
                  ]}
                  rows={componentes as unknown as Record<string, unknown>[]}
                />
              )}
            </div>

            <div>
              <UploadZone
                label="Centros de trabajo"
                description="Opcional · Columnas: ID (identificación), Centro de trabajo"
                fileName={centrosFile?.name}
                error={centrosFile?.error}
                onFile={(f) =>
                  handleUpload(f, parseCentrosTrabajo, setCentros, setCentrosFile)
                }
              />
              {centrosFile?.sheetNames && (
                <SheetSelector
                  sheets={centrosFile.sheetNames}
                  selected={centrosFile.selectedSheet}
                  onSelect={(s) => handleSheetSelect(s, centrosFile, parseCentrosTrabajo, setCentros, setCentrosFile)}
                />
              )}
              {centros && (
                <DataPreview
                  columns={[
                    { key: 'id', label: 'ID' },
                    { key: 'nombre', label: 'Centro de trabajo' },
                  ]}
                  rows={centros as unknown as Record<string, unknown>[]}
                />
              )}
            </div>

            <div>
              <UploadZone
                label="Operaciones"
                description="Opcional · Columna: Operación — una por fila, en el mismo orden que los centros de trabajo"
                fileName={operacionesFile?.name}
                error={operacionesFile?.error}
                onFile={(f) =>
                  handleUpload(f, parseOperaciones, setOperaciones, setOperacionesFile)
                }
              />
              {operacionesFile?.sheetNames && (
                <SheetSelector
                  sheets={operacionesFile.sheetNames}
                  selected={operacionesFile.selectedSheet}
                  onSelect={(s) => handleSheetSelect(s, operacionesFile, parseOperaciones, setOperaciones, setOperacionesFile)}
                />
              )}
              {operaciones && (
                <DataPreview
                  columns={[{ key: 'nombre', label: 'Operación' }]}
                  rows={operaciones as unknown as Record<string, unknown>[]}
                />
              )}
            </div>
          </div>

          {/* Component rules */}
          <ComponentRulesPanel
            rules={componentRules}
            onChange={setComponentRules}
            variantes={variantes ?? []}
            componentes={componentes ?? []}
          />

          {/* Config + generate */}
          {allLoaded && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Variantes" value={variantes.length} />
                <Stat label="Componentes" value={componentes.length} />
                {centros !== null && <Stat label="Centros de trabajo" value={centros.length} />}
                {operaciones !== null && <Stat label="Operaciones" value={operaciones.length} />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">ID inicial de BoM</label>
                  <input
                    type="number"
                    value={startId}
                    onChange={(e) => { setStartId(Number(e.target.value)); setDownloadUrl(null); setBoms([]) }}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">ID inicial de líneas</label>
                  <input
                    type="number"
                    value={startLineId}
                    onChange={(e) => { setStartLineId(Number(e.target.value)); setDownloadUrl(null); setBoms([]) }}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {usePasoRango && !variantesConfirmed && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Verifica que Paso y Rango se hayan extraído correctamente antes de generar.
                </div>
              )}

              <Button onClick={handleGenerate} className="w-full">
                Generar BoM
              </Button>
            </div>
          )}

          {/* Download */}
          {downloadUrl && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  ✓
                </span>
                <p className="text-sm font-medium text-foreground">
                  {boms.length} BoMs generadas · {totalLines} líneas totales
                </p>
              </div>
              <div className={cn('grid gap-3', downloadOpsUrl ? 'grid-cols-2' : 'grid-cols-1')}>
                <a href={downloadUrl} download="bom_output.xlsx" className="block">
                  <Button variant="outline" className="w-full">
                    Descargar BoM
                  </Button>
                </a>
                {downloadOpsUrl && (
                  <a href={downloadOpsUrl} download="operaciones_output.xlsx" className="block">
                    <Button variant="outline" className="w-full">
                      Descargar Operaciones
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-16 border-t border-border py-6 text-center text-xs text-muted-foreground">
        Desarrollado por <span className="text-foreground font-medium">Nicolás Ruiz</span>
        {' · '}
        <a href="mailto:nruizz@proton.me" className="hover:text-foreground transition-colors">nruizz@proton.me</a>
      </footer>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-3 text-center">
      <p className="text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function PasoRangoVerification({
  variantes,
  confirmed,
  onConfirm,
  onReset,
}: {
  variantes: Variante[]
  confirmed: boolean
  onConfirm: () => void
  onReset: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const maxRows = 5
  const visible = expanded ? variantes : variantes.slice(0, maxRows)
  const hidden = variantes.length - maxRows

  return (
    <div className={cn(
      'mt-2 rounded-lg border text-xs',
      confirmed
        ? 'border-primary/30 bg-primary/5'
        : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {confirmed ? (
          <svg className="h-3.5 w-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className={cn(
          'flex-1 font-medium',
          confirmed ? 'text-primary' : 'text-amber-700 dark:text-amber-400'
        )}>
          {confirmed ? 'Paso y Rango verificados' : 'Verificar extracción de Paso y Rango'}
        </span>
        {confirmed ? (
          <button
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Deshacer
          </button>
        ) : (
          <button
            onClick={onConfirm}
            className="rounded bg-amber-600 px-2.5 py-0.5 font-medium text-white hover:bg-amber-700 transition-colors dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            Se ve bien ✓
          </button>
        )}
      </div>

      {/* Table */}
      {!confirmed && (
        <div className="border-t border-amber-200 dark:border-amber-900/40">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-100/50 dark:border-amber-900/40 dark:bg-amber-950/30">
                  <th className="px-3 py-1.5 text-left font-medium text-amber-800 dark:text-amber-300">Variant Name</th>
                  <th className="px-3 py-1.5 text-left font-medium text-amber-800 dark:text-amber-300 whitespace-nowrap">Rango</th>
                  <th className="px-3 py-1.5 text-left font-medium text-amber-800 dark:text-amber-300 whitespace-nowrap">Paso</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((v, i) => (
                  <tr key={i} className={cn(
                    'border-b border-amber-100 last:border-0 dark:border-amber-900/20',
                    i % 2 === 1 && 'bg-amber-50/50 dark:bg-amber-950/10'
                  )}>
                    <td className="max-w-[260px] truncate px-3 py-1.5 text-foreground" title={v.varianteName}>
                      {v.varianteName}
                    </td>
                    <td className="px-3 py-1.5 font-medium text-foreground">{v.rango}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground">{v.paso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {variantes.length > maxRows && (
            <div className="border-t border-amber-100 px-3 py-1.5 dark:border-amber-900/20">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-amber-700 hover:text-amber-900 transition-colors dark:text-amber-400"
              >
                {expanded ? 'Ver menos' : `Ver ${hidden} fila${hidden !== 1 ? 's' : ''} más`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ComponentRulesPanel({
  rules,
  onChange,
  variantes,
  componentes,
}: {
  rules: ComponentRule[]
  onChange: (r: ComponentRule[]) => void
  variantes: Variante[]
  componentes: Componente[]
}) {
  const [open, setOpen] = useState(false)

  // Componentes que NO pertenecen a ningún grupo activo → siempre incluidos
  const activeRules = rules.filter((r) => r.componentPrefix.trim() !== '')
  const fixedComponents = componentes.filter((c) =>
    !activeRules.some((r) => startsWithDeaccent(c.nombre, r.componentPrefix))
  )

  function addRule() {
    onChange([...rules, {
      id: crypto.randomUUID(),
      label: '',
      componentPrefix: '',
      extractMode: 'firstSegment',
      matchMode: 'normalizedContains',
    }])
  }

  function updateRule(id: string, patch: Partial<ComponentRule>) {
    onChange(rules.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  function removeRule(id: string) {
    onChange(rules.filter((r) => r.id !== id))
  }

  const selectCls = 'rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
  const inputCls = `${selectCls} w-full`

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
      >
        <svg className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-foreground">Grupos de componentes variables</span>
        <span className="ml-auto text-xs text-muted-foreground">{rules.length} grupo{rules.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Cada grupo define una <strong>familia de placas variables</strong>: se incluye solo una por variante,
            la que coincida con el código del Variant Name.
            <br />
            <strong>Importante:</strong> los componentes que no pertenecen a ningún grupo se incluyen siempre (Kit de armado, Adhesivo, etc.).
          </p>

          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              variantes={variantes}
              componentes={componentes}
              inputCls={inputCls}
              selectCls={selectCls}
              onUpdate={(p) => updateRule(rule.id, p)}
              onRemove={() => removeRule(rule.id)}
            />
          ))}

          <button
            onClick={addRule}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir grupo
          </button>

          {/* Componentes fijos */}
          {componentes.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Componentes fijos — siempre incluidos ({fixedComponents.length})
              </p>
              {fixedComponents.length === 0 ? (
                <p className="text-[10px] text-destructive">
                  Todos los componentes están en grupos. Los componentes fijos (Kit de armado, Adhesivo, etc.) no deben estar en ningún grupo.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {fixedComponents.map((c) => (
                    <span key={c.nombre} className="rounded bg-muted px-2 py-0.5 text-[10px] text-foreground">
                      {c.nombre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s.\-]/g, '')
    .replace(/([a-z])0+(\d)/g, '$1$2')
}

function startsWithDeaccent(s: string, prefix: string): boolean {
  const n = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return n(s).startsWith(n(prefix))
}

function RuleRow({
  rule, variantes, componentes, inputCls, selectCls, onUpdate, onRemove,
}: {
  rule: ComponentRule
  variantes: Variante[]
  componentes: Componente[]
  inputCls: string
  selectCls: string
  onUpdate: (p: Partial<ComponentRule>) => void
  onRemove: () => void
}) {
  const prefixEmpty = rule.componentPrefix.trim() === ''

  // Live preview: test against first matching variant
  const preview = (() => {
    if (!rule.componentPrefix.trim() || !variantes.length) return null
    const groupComponents = componentes.filter((c) =>
      startsWithDeaccent(c.nombre, rule.componentPrefix)
    )
    if (!groupComponents.length) return { error: 'No hay componentes con ese prefijo' }

    const results = variantes.slice(0, 3).map((v) => {
      let code: string | null = null
      if (rule.extractMode === 'brackets') {
        const m = v.varianteName.match(/\[([^\]]+)\]/)
        code = m ? m[1].trim() : null
      } else {
        const m = v.varianteName.match(/^([^,]+)/)
        code = m ? m[1].trim() : null
      }
      if (!code) return { variant: v.varianteName, code: null, match: null }

      const match = groupComponents.find((c) => {
        if (rule.matchMode === 'exactPrefix') {
          return new RegExp(`^${code!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(c.nombre)
        }
        return normalize(c.nombre).includes(normalize(code!))
      })
      return { variant: v.varianteName, code, match: match?.nombre ?? null }
    })
    return { results }
  })()

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={rule.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Nombre del grupo (ej: Placas Yeso Cartón)"
          className={inputCls}
        />
        <button onClick={onRemove} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Componentes del grupo</label>
          <input
            value={rule.componentPrefix}
            onChange={(e) => onUpdate({ componentPrefix: e.target.value })}
            placeholder="Empieza con... (ej: Yeso Cartón)"
            className={cn(inputCls, prefixEmpty && 'border-amber-400')}
          />
          {prefixEmpty ? (
            <p className="text-[10px] text-amber-600">Escribe el prefijo del nombre del componente (ej: &quot;Yeso Cartón&quot;)</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Prefijo del nombre del componente</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Extraer código de</label>
          <select value={rule.extractMode} onChange={(e) => onUpdate({ extractMode: e.target.value as ComponentRule['extractMode'] })} className={selectCls}>
            <option value="brackets">Entre corchetes [CÓDIGO]</option>
            <option value="firstSegment">Primer segmento antes de coma</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Modo de coincidencia</label>
          <select value={rule.matchMode} onChange={(e) => onUpdate({ matchMode: e.target.value as ComponentRule['matchMode'] })} className={selectCls}>
            <option value="exactPrefix">Prefijo exacto</option>
            <option value="normalizedContains">Contiene (normalizado)</option>
          </select>
          {rule.matchMode === 'normalizedContains' && (
            <p className="text-[10px] text-muted-foreground">Ignora espacios, puntos y ceros → ST08 = ST 8mm</p>
          )}
        </div>
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded border border-border bg-muted/30 px-3 py-2 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Vista previa (primeras variantes)</p>
          {'error' in preview ? (
            <p className="text-[10px] text-destructive">{preview.error}</p>
          ) : (
            preview.results.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="truncate text-muted-foreground max-w-[160px]" title={r.variant}>{r.variant}</span>
                <span className="shrink-0 text-muted-foreground">→</span>
                <span className="shrink-0 font-mono text-foreground">{r.code ?? '—'}</span>
                <span className="shrink-0 text-muted-foreground">→</span>
                {r.match ? (
                  <span className="shrink-0 text-primary font-medium truncate max-w-[160px]" title={r.match}>{r.match} ✓</span>
                ) : (
                  <span className="shrink-0 text-destructive">sin coincidencia</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function SheetSelector({
  sheets,
  selected,
  onSelect,
}: {
  sheets: string[]
  selected?: string
  onSelect: (sheet: string) => void
}) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
      <svg className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-xs text-amber-700 dark:text-amber-400">Selecciona la hoja:</span>
      <select
        value={selected ?? ''}
        onChange={(e) => e.target.value && onSelect(e.target.value)}
        className="ml-auto rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {!selected && <option value="">— elige una hoja —</option>}
        {sheets.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
