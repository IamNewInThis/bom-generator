'use client'

import { useState } from 'react'
import { UploadZone } from '@/components/upload-zone'
import { DataPreview } from '@/components/data-preview'
import { Button } from '@/components/ui/button'
import { parseVariantes, parseComponentes, parseCentrosTrabajo, parseOperaciones } from '@/lib/excel-parser'
import { processBoms } from '@/lib/bom-processor'
import { exportToExcel } from '@/lib/excel-exporter'
import { exportOperationsToExcel } from '@/lib/operations-exporter'
import type { Variante, Componente, CentroTrabajo, Operacion, Bom } from '@/lib/types'

interface FileState {
  name: string
  error?: string
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

  const [startId, setStartId] = useState(30000)
  const [startLineId, setStartLineId] = useState(60000)
  const [boms, setBoms] = useState<Bom[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadOpsUrl, setDownloadOpsUrl] = useState<string | null>(null)

  async function handleUpload<T>(
    file: File,
    parser: (buf: ArrayBuffer) => T,
    onSuccess: (data: T) => void,
    setFileState: (s: FileState) => void
  ) {
    if (!file.name.endsWith('.xlsx')) {
      setFileState({ name: file.name, error: 'El archivo debe ser un .xlsx' })
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const data = parser(buffer)
      onSuccess(data)
      setFileState({ name: file.name })
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

  const allLoaded =
    variantes !== null && componentes !== null && centros !== null && operaciones !== null

  function handleGenerate() {
    if (!variantes || !componentes || !centros) return
    const generated = processBoms({ variantes, componentes, centrosTrabajo: centros }, startId, startLineId)

    const bomBlob = exportToExcel(generated)
    const opsBlob = exportOperationsToExcel(generated, centros, operaciones)

    setBoms(generated)
    setDownloadUrl(URL.createObjectURL(bomBlob))
    setDownloadOpsUrl(URL.createObjectURL(opsBlob))
  }

  const totalLines = boms.reduce((acc, b) => acc + b.lineas.length, 0)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Parq BoM Generator
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
                  handleUpload(f, parseVariantes, setVariantes, setVariantesFile)
                }
              />
              {variantes && (
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
                description="Columnas: ID (identificación), Centro de trabajo"
                fileName={centrosFile?.name}
                error={centrosFile?.error}
                onFile={(f) =>
                  handleUpload(f, parseCentrosTrabajo, setCentros, setCentrosFile)
                }
              />
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
                description="Columna: Operación — una por fila, en el mismo orden que los centros de trabajo"
                fileName={operacionesFile?.name}
                error={operacionesFile?.error}
                onFile={(f) =>
                  handleUpload(f, parseOperaciones, setOperaciones, setOperacionesFile)
                }
              />
              {operaciones && (
                <DataPreview
                  columns={[{ key: 'nombre', label: 'Operación' }]}
                  rows={operaciones as unknown as Record<string, unknown>[]}
                />
              )}
            </div>
          </div>

          {/* Config + generate */}
          {allLoaded && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <Stat label="Variantes" value={variantes.length} />
                <Stat label="Componentes" value={componentes.length} />
                <Stat label="Centros de trabajo" value={centros.length} />
                <Stat label="Operaciones" value={operaciones.length} />
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

              <Button onClick={handleGenerate} className="w-full">
                Generar BoM
              </Button>
            </div>
          )}

          {/* Download */}
          {downloadUrl && downloadOpsUrl && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  ✓
                </span>
                <p className="text-sm font-medium text-foreground">
                  {boms.length} BoMs generadas · {totalLines} líneas totales
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a href={downloadUrl} download="bom_output.xlsx" className="block">
                  <Button variant="outline" className="w-full">
                    Descargar BoM
                  </Button>
                </a>
                <a href={downloadOpsUrl} download="operaciones_output.xlsx" className="block">
                  <Button variant="outline" className="w-full">
                    Descargar Operaciones
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
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
