'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// ExportSubTab — exports the scenarios the current user can see.
//
// Reuses /api/admin/export (which already enforces per-user visibility:
// admins see all, regular users see only own + collaborations). Two
// formats: JSON (full data) and CSV (flattened table).
//
// Per Rule 4A: a user can ONLY export scenarios they can see — the API
// itself enforces this, so even if the user somehow hits this tab with
// no access, they get an empty export.
export default function ExportSubTab() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'super_admin'

  const { data: scenariosData, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const scenarios = Array.isArray(scenariosData) ? scenariosData : []

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/admin/export?format=${format}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `massapro-export-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    }
  }

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
          <Download className="h-5 w-5" />
          {t('platform.tab.export')}
        </CardTitle>
        <CardDescription>
          Exports {isAdmin ? 'all scenarios' : 'the scenarios you can access'} — JSON (full data) or CSV (flat table).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
            Loading…
          </div>
        ) : (
          <>
            <div className="rounded-lg p-4" style={{ background: LAVENDER }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: JET }}>
                    {scenarios.length} scenarios available to export
                  </div>
                  <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                    {isAdmin
                      ? 'As an admin, you see all scenarios across all clients.'
                      : 'You see only scenarios where you have view, comment, or edit access.'}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: '#fff' }}>
                  {isAdmin ? 'Admin view' : 'Per-user view'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => handleExport('json')}
                size="lg"
                className="h-auto py-6 flex-col items-start"
                style={{ background: ORCHID, color: '#fff' }}
              >
                <FileJson className="h-6 w-6 mb-2" />
                <span className="font-semibold">Export as JSON</span>
                <span className="text-xs opacity-90 font-normal">Full data incl. KPIs, links, attachments metadata</span>
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                size="lg"
                variant="outline"
                className="h-auto py-6 flex-col items-start"
                style={{ borderColor: ORCHID, color: ORCHID }}
              >
                <FileSpreadsheet className="h-6 w-6 mb-2" />
                <span className="font-semibold">Export as CSV</span>
                <span className="text-xs opacity-80 font-normal">Flattened table — open in Excel or Google Sheets</span>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
