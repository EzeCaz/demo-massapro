'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Plug, Pencil, Trash2, Download, Loader2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// IntegrationEditSubTab — admin-only.
//
// Lists ALL integration setups across all clients (admins only), lets the
// admin open the form on /integration-setup/[id] in a new tab to edit
// on behalf of the client. Also allows download of the integration PDF.
export default function IntegrationEditSubTab() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-integration-setups'],
    queryFn: async () => {
      // The admin-only "all setups" view is the same /api/integration-setups
      // endpoint — admins receive all setups (per the existing route
      // behavior), regular users receive only their own.
      const res = await fetch('/api/integration-setups')
      if (!res.ok) throw new Error('Failed to load integration setups')
      return res.json()
    },
  })

  const setups = data?.setups || data || []
  const filtered = (Array.isArray(setups) ? setups : []).filter((s: any) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (s.name || '').toLowerCase().includes(q) || (s.client?.email || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <Plug className="h-5 w-5" />
          {t('admin.integration.title')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.integration.subtitle')}</p>
      </div>

      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle style={{ color: ORCHID }}>{t('admin.integration.title')}</CardTitle>
              <CardDescription>{filtered.length} integration setups</CardDescription>
            </div>
            <Input
              placeholder="Search by name or client email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              style={{ borderColor: LAVENDER }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
              <p className="text-sm italic" style={{ color: JET }}>No integration setups found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s: any) => (
                <div
                  key={s.id}
                  className="rounded-lg border-2 p-3 flex items-center justify-between gap-2"
                  style={{ borderColor: LAVENDER, background: '#fff' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: JET }}>{s.name}</span>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: JET, opacity: 0.7 }}>
                      Client: {s.client?.name || s.client?.email || '—'} · Updated {new Date(s.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={`/integration-setup/${s.id}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" title="Open editor" className="h-8 w-8 p-0" style={{ color: ORCHID }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </a>
                    <a href={`/api/integration-setups/${s.id}/pdf?preview=true`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" title="View PDF" className="h-8 w-8 p-0" style={{ color: ORCHID }}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
