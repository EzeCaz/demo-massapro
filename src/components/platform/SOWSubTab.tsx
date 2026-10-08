'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus, FileText, Download, Edit, Trash2, Loader2, Save, Eye,
} from 'lucide-react'
import { exportSowWord } from '@/lib/sow-export'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// SOWSubTab — list of SOW snapshots the user has saved on the platform.
// Each row: name, status, updated date, owner, actions.
//
// Actions per SOW:
//   - Edit    → opens /sow in a new tab with the snapshot loaded (via URL
//               param ?snapshot=<id>)
//   - Word    → downloads as .docx (uses the redesigned brand export)
//   - PDF     → downloads as .pdf (uses the new PDFKit-based PDF route)
//   - Delete  → deletes the snapshot
//
// "+ Create new SOW" button opens a naming dialog. On create, we save
// an empty SOWSnapshot on the platform and immediately open the SOW
// Builder at /sow?snapshot=<id> in a new tab. The user can have multiple
// SOWs in parallel, each with its own name.
export default function SOWSubTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')

  const { data: snapshotsData, isLoading } = useQuery({
    queryKey: ['sow-snapshots'],
    queryFn: async () => {
      const res = await fetch('/api/sow-snapshots')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const snapshots = snapshotsData?.snapshots || []

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sow-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          status: 'draft',
          payload: {
            cover: {
              clientName: '', clientDemo: '', projectName: createName, date: new Date().toISOString().split('T')[0],
              version: 'v1.0', preparedBy: '', overview: '',
            },
            selectedServiceIds: [], // user picks services in the builder
            customServices: [],
            taskState: {},
            specValues: {},
            milestones: [],
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sow-snapshots'] })
      toast.success('SOW created — opening builder…')
      setShowCreate(false)
      setCreateName('')
      // Open the SOW builder at /sow with the snapshot loaded
      window.open(`/sow?snapshot=${data.snapshot.id}`, '_blank')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sow-snapshots/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sow-snapshots'] })
      toast.success('SOW deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const downloadWord = async (s: any) => {
    try {
      const payload = s.payload || {}
      await exportSowWord({
        cover: payload.cover || { clientName: '', clientDemo: '', projectName: s.name, date: '', version: 'v1.0', preparedBy: '', overview: '' },
        selectedServiceIds: payload.selectedServiceIds || [],
        customServices: payload.customServices || [],
        taskState: payload.taskState || {},
        specValues: payload.specValues || {},
        customTasksByBuiltinService: payload.customTasksByBuiltinService,
        milestones: payload.milestones,
      })
      toast.success('Word downloaded')
    } catch (e: any) {
      toast.error('Export failed: ' + (e?.message || 'unknown'))
    }
  }

  const downloadPDF = (s: any) => {
    // The PDF route downloads the snapshot directly from the DB
    window.open(`/api/sow-snapshots/${s.id}/pdf`, '_blank')
  }

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <FileText className="h-5 w-5" />
              {t('platform.tab.integration.sow')}
            </CardTitle>
            <CardDescription>{snapshots.length} SOW documents</CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} style={{ background: ORCHID, color: '#fff' }} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {t('platform.tab.integration.sow.create')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
            Loading…
          </div>
        ) : snapshots.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
            <p className="text-sm italic" style={{ color: JET }}>
              No SOWs yet. Click <strong>+ Create new SOW</strong> to start.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s: any) => (
              <div
                key={s.id}
                className="rounded-lg border-2 p-3 flex items-center justify-between gap-2"
                style={{ borderColor: LAVENDER, background: '#fff' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: JET }}>{s.name}</span>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                      {s.status}
                    </Badge>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: JET, opacity: 0.7 }}>
                    Owner: {s.owner?.name || s.owner?.email} · Updated {new Date(s.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a href={`/sow?snapshot=${s.id}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" title="Edit in builder" className="h-8 w-8 p-0" style={{ color: ORCHID }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => downloadWord(s)} title="Download Word" className="h-8 w-8 p-0" style={{ color: ORCHID }}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadPDF(s)} title="Download PDF" className="h-8 w-8 p-0" style={{ color: '#EF4444' }}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { if (window.confirm(`Delete SOW "${s.name}"?`)) deleteMut.mutate(s.id) }}
                    title="Delete"
                    className="h-8 w-8 p-0"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create SOW dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>{t('platform.tab.integration.sow.create')}</DialogTitle>
            <DialogDescription>
              Give your SOW a name. You can have multiple SOWs in parallel — each one is saved on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>SOW name</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g., Acme Inc. — Contact Center Implementation"
                style={{ borderColor: LAVENDER }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && createName.trim()) createMut.mutate() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !createName.trim()}
              style={{ background: ORCHID, color: '#fff' }}
            >
              {createMut.isPending ? 'Creating…' : 'Create & open builder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
