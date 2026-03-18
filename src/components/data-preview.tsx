'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DataPreviewProps {
  columns: { key: string; label: string }[]
  rows: Record<string, unknown>[]
  maxRows?: number
}

export function DataPreview({ columns, rows, maxRows = 5 }: DataPreviewProps) {
  const [expanded, setExpanded] = useState(false)

  if (rows.length === 0) return null

  const visible = expanded ? rows : rows.slice(0, maxRows)
  const hidden = rows.length - maxRows

  return (
    <div className="mt-2 space-y-1.5">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border last:border-0',
                  i % 2 === 1 && 'bg-muted/20'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="max-w-[200px] truncate px-3 py-1.5 text-foreground"
                    title={String(row[col.key] ?? '')}
                  >
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > maxRows && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded
            ? 'Ver menos'
            : `Ver ${hidden} fila${hidden !== 1 ? 's' : ''} más`}
        </button>
      )}
    </div>
  )
}
