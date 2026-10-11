'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  FileText, Edit, Trash2, Download, Save, Loader2, PenTool, Clock, Search,
} from 'lucide-react'

const ORCHID = '#7F39FB'
const JET = '#0A0711'
const LAVENDER = '#E9D5FF'

// NDAFormEditSubTab — admin-only.
//
// Lists all NDA snapshots on the platform, grouped by recipient/client name.
// Admin can:
//   - Search/filter by recipient name
//   - Edit any NDA's name, status, and payload (JSON)
//   - Download as Word
//   - Download as PDF
//   - View e-signature status (signed date + timestamp)
//   - Delete an NDA
//
// Also shows a summary at the top: total NDAs, signed count, draft count.
export default function NDAFormEditSubTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editSnap, setEditSnap] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  // ---- List all NDA snapshots (admin sees all) ----
  const { data: snapshotsData, isLoading } = useQuery({
    queryKey: ['nda-snapshots', 'admin'],
    queryFn: async () => {
      const res = await fetch('/api/nda-snapshots')
      if (!res.ok) throw new Error('Failed to load NDA snapshots')
      return res.json()
    },
  })
  const snapshots = snapshotsData?.snapshots || []

  // Filter by search
  const filtered = snapshots.filter((s: any) => {
    if (!search) return true
    const payload = s.payload || {}
    const recipientName = payload.cover?.recipientName || ''
    const name = s.name || ''
    const owner = s.owner?.email || ''
    return (
      recipientName.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      owner.toLowerCase().includes(search.toLowerCase())
    )
  })

  // ---- Edit dialog ----
  const openEdit = (s: any) => {
    setEditSnap(s)
    setEditForm({
      name: s.name,
      status: s.status,
      payloadJson: JSON.stringify(s.payload, null, 2),
    })
  }

  const saveEdit = useMutation({
    mutationFn: async () => {
      let payload: any
      try {
        payload = JSON.parse(editForm.payloadJson)
      } catch {
        throw new Error('Invalid JSON in payload')
      }
      const res = await fetch(`/api/nda-snapshots/${editSnap.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          status: editForm.status,
          payload,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed to save')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nda-snapshots', 'admin'] })
      toast.success('NDA updated')
      setEditSnap(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // ---- Delete ----
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/nda-snapshots/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nda-snapshots', 'admin'] })
      toast.success('NDA deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // ---- Download Word ----
  const downloadWord = async (s: any) => {
    try {
      const { exportNdaWord } = await import('@/lib/nda-export')
      await exportNdaWord({ cover: s.payload.cover }, '/massapro-logo.png')
      toast.success('Word downloaded')
    } catch (e: any) {
      toast.error('Export failed: ' + (e?.message || 'unknown'))
    }
  }

  // ---- Download PDF ----
  const downloadPDF = (s: any) => {
    window.open(`/api/nda-snapshots/${s.id}/pdf`, '_blank')
  }

  // ---- Summary stats ----
  const totalNdas = snapshots.length
  const signedCount = snapshots.filter((s: any) => s.status === 'signed').length
  const draftCount = snapshots.filter((s: any) => s.status === 'draft').length

  // ---- Group by recipient (client) name ----
  const grouped: Record<string, any[]> = {}
  filtered.forEach((s: any) => {
    const recipientName = s.payload?.cover?.recipientName || 'Unknown Recipient'
    if (!grouped[recipientName]) grouped[recipientName] = []
    grouped[recipientName].push(s)
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <FileText className="h-5 w-5" />
          NDA Form Edit
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          All Mutual NDAs on the platform, grouped by recipient name
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card style={{ borderColor: LAVENDER }}>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase font-semibold tracking-wide" style={{ color: JET, opacity: 0.7 }}>Total NDAs</div>
            <div className="text-3xl font-extrabold" style={{ color: ORCHID }}>{totalNdas}</div>
          </CardContent>
        </Card>
        <Card style={{ borderColor: LAVENDER }}>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase font-semibold tracking-wide" style={{ color: JET, opacity: 0.7 }}>Drafts</div>
            <div className="text-3xl font-extrabold" style={{ color: ORCHID }}>{draftCount}</div>
          </CardContent>
        </Card>
        <Card style={{ borderColor: LAVENDER }}>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase font-semibold tracking-wide" style={{ color: JET, opacity: 0.7 }}>Signed</div>
            <div className="text-3xl font-extrabold" style={{ color: '#10B981' }}>{signedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: JET, opacity: 0.5 }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient name, NDA name, or owner email…"
            className="pl-10"
            style={{ borderColor: LAVENDER }}
          />
        </div>
      </div>

      {/* List grouped by recipient */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Loading NDAs…
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
          <p className="text-sm italic" style={{ color: JET }}>
            No NDAs found. {search ? 'Try a different search term.' : 'Create one at /nda to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([recipientName, ndas]) => (
              <Card key={recipientName} style={{ borderColor: LAVENDER }}>
                <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                        <FileText className="h-5 w-5" />
                        {recipientName}
                      </CardTitle>
                      <CardDescription>
                        {ndas.length} NDA{ndas.length !== 1 ? 's' : ''} ·{' '}
                        {ndas[0].payload?.cover?.recipientEmail || 'No email'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                      {ndas.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {ndas
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((s: any) => {
                      const payload = s.payload || {}
                      const cover = payload.cover || {}
                      const effectiveDate = cover.effectiveDate || '—'
                      const signedAt = payload.signedAt
                      const signedBy = payload.signedBy
                      return (
                        <div
                          key={s.id}
                          className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          style={{ borderColor: LAVENDER, background: '#fff' }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm" style={{ color: JET }}>{s.name}</span>
                              <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                                {s.status}
                              </Badge>
                              {signedAt && (
                                <Badge variant="outline" className="text-xs" style={{ borderColor: '#10B981', color: '#10B981' }}>
                                  <PenTool className="h-3 w-3 mr-1" />
                                  Signed
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs mt-1" style={{ color: JET, opacity: 0.7 }}>
                              Effective: {effectiveDate} · Updated {new Date(s.updatedAt).toLocaleDateString()}
                              {signedAt && (
                                <span className="ml-2 flex items-center gap-1 inline-flex">
                                  <Clock className="h-3 w-3" />
                                  Signed: {new Date(signedAt).toLocaleString()}
                                  {signedBy && ` by ${signedBy}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a href={`/nda?snapshot=${s.id}`} target="_blank" rel="noreferrer">
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
                              onClick={() => { if (window.confirm(`Delete NDA "${s.name}"?`)) deleteMut.mutate(s.id) }}
                              title="Delete"
                              className="h-8 w-8 p-0"
                              style={{ color: '#EF4444' }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editSnap} onOpenChange={(v) => !v && setEditSnap(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>Edit NDA</DialogTitle>
            <DialogDescription>Edit the NDA name, status, and payload (JSON)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>NDA Name</Label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm((p: any) => ({ ...p, name: e.target.value }))}
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Status</Label>
              <Input
                value={editForm.status || ''}
                onChange={(e) => setEditForm((p: any) => ({ ...p, status: e.target.value }))}
                placeholder="draft, sent, signed, expired"
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Payload (JSON)</Label>
              <Textarea
                value={editForm.payloadJson || ''}
                onChange={(e) => setEditForm((p: any) => ({ ...p, payloadJson: e.target.value }))}
                rows={12}
                className="font-mono text-xs"
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSnap(null)}>Cancel</Button>
            <Button
              onClick={() => saveEdit.mutate()}
              disabled={saveEdit.isPending}
              style={{ background: ORCHID, color: '#fff' }}
            >
              {saveEdit.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
