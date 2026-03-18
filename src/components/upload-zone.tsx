'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  label: string
  description?: string
  fileName?: string
  error?: string
  onFile: (file: File) => void
  disabled?: boolean
}

export function UploadZone({
  label,
  description,
  fileName,
  error,
  onFile,
  disabled,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  const isLoaded = !!fileName && !error

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors cursor-pointer select-none',
          isLoaded
            ? 'border-primary/40 bg-primary/5'
            : error
            ? 'border-destructive/40 bg-destructive/5'
            : dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        {/* Icon */}
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          isLoaded ? 'bg-primary/10' : error ? 'bg-destructive/10' : 'bg-muted'
        )}>
          {isLoaded ? (
            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : error ? (
            <svg className="h-4 w-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          {isLoaded ? (
            <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Arrastra un <span className="font-medium text-foreground">.xlsx</span> o haz clic para seleccionar
            </p>
          )}
        </div>

        {/* Replace hint */}
        {isLoaded && (
          <span className="shrink-0 text-xs text-muted-foreground">reemplazar</span>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
