'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UploadZone } from '@/components/upload-zone'
import { DataPreview } from '@/components/data-preview'
import { Button } from '@/components/ui/button'
import { parseVariantesConCoste, getSheetNames } from '@/lib/excel-parser'
import { exportPriceList } from '@/lib/price-list-exporter'
import type { VarianteConCoste } from '@/lib/types'

interface FileState {
  name: string
  error?: string
  buffer?: ArrayBuffer
  sheetNames?: string[]
  selectedSheet?: string
}

export default function ListasDePrecios() {
  const [variantes, setVariantes] = useState<VarianteConCoste[] | null>(null)
  const [fileState, setFileState] = useState<FileState | null>(null)
  const [margin, setMargin] = useState<number>(30)
  const [tarifaId, setTarifaId] = useState<number>(1)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  async function handleUpload(file: File) {
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
        const data = parseVariantesConCoste(buffer, sheetNames[0])
        setVariantes(data)
        setFileState({ name: file.name })
      }
    } catch (e) {
      setFileState({
        name: file.name,
        error: e instanceof Error ? e.message : 'Error al leer el archivo',
      })
    }
    setDownloadUrl(null)
  }

  function handleSheetSelect(sheet: string) {
    if (!fileState?.buffer) return
    try {
      const data = parseVariantesConCoste(fileState.buffer, sheet)
      setVariantes(data)
      setFileState({ ...fileState, selectedSheet: sheet, error: undefined })
    } catch (e) {
      setFileState({
        ...fileState,
        selectedSheet: sheet,
        error: e instanceof Error ? e.message : 'Error al leer la hoja',
      })
    }
    setDownloadUrl(null)
  }

  function handleGenerate() {
    if (!variantes) return
    const blob = exportPriceList(variantes, margin, tarifaId)
    setDownloadUrl(URL.createObjectURL(blob))
  }

  const previewRows = variantes?.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    varianteName: v.varianteName,
    coste: v.coste.toLocaleString('es-CL', { minimumFractionDigits: 2 }),
    precio: Math.round(v.coste * (1 + margin / 100) * 100) / 100,
  })) ?? []

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Listas de precios
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Genera listas de precios para importar en Odoo v18
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← BoM Generator
          </Link>
        </div>

        <div className="space-y-8">
          {/* Upload */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-medium text-foreground">Archivo de entrada</h2>

            <div>
              <UploadZone
                label="Variantes con coste"
                description="Columnas: ID (identificación), Nombre, Variant Name, Coste"
                fileName={fileState?.name}
                error={fileState?.error}
                onFile={handleUpload}
              />
              {fileState?.sheetNames && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {fileState.sheetNames.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSheetSelect(s)}
                      className={`rounded-md px-3 py-1 text-xs transition-colors ${
                        fileState.selectedSheet === s
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {variantes && (
                <DataPreview
                  columns={[
                    { key: 'id', label: 'ID' },
                    { key: 'nombre', label: 'Nombre' },
                    { key: 'varianteName', label: 'Variant Name' },
                    { key: 'coste', label: 'Coste' },
                    { key: 'precio', label: `Precio (+${margin}%)` },
                  ]}
                  rows={previewRows}
                />
              )}
            </div>
          </div>

          {/* Config & Generate */}
          {variantes && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h2 className="text-sm font-medium text-foreground">Configuración</h2>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <label className="w-36 text-sm text-foreground whitespace-nowrap">
                    ID de tarifa
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={tarifaId}
                    onChange={(e) => {
                      setTarifaId(parseInt(e.target.value) || 1)
                      setDownloadUrl(null)
                    }}
                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-36 text-sm text-foreground whitespace-nowrap">
                    Margen de ganancia
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={0.1}
                      value={margin}
                      onChange={(e) => {
                        setMargin(parseFloat(e.target.value) || 0)
                        setDownloadUrl(null)
                      }}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {variantes.length} variante{variantes.length !== 1 ? 's' : ''}
                </p>
                <Button onClick={handleGenerate}>
                  Generar lista de precios
                </Button>
              </div>
            </div>
          )}

          {/* Download */}
          {downloadUrl && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <p className="text-sm font-medium text-foreground">Archivo generado</p>
              <a
                href={downloadUrl}
                download="lista_de_precios.xlsx"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                lista_de_precios.xlsx
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
