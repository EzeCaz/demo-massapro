'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  FileText, Plus, Sparkles, Edit, Trash2, Download, Save, Loader2, Wand2,
} from 'lucide-react'
import { exportSowWord } from '@/lib/sow-export'
import { generateSowContent } from '@/lib/sow-ai'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// SOWFormEditSubTab — admin-only.
//
// Lists all SOW snapshots saved on the platform, lets the admin open any
// one to edit (name, status, payload), download as Word, or delete. Also
// exposes the AI generator: the admin types a brief and gets a draft SOW
// section (uses /api/sow-ai/generate which tries OpenAI → Z-AI → SDK →
// fallback).
export default function SOWFormEditSubTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  // ---- List snapshots ----
  const { data: snapshotsData, isLoading } = useQuery({
    queryKey: ['sow-snapshots'],
    queryFn: async () => {
      const res = await fetch('/api/sow-snapshots')
      if (!res.ok) throw new Error('Failed to load SOW snapshots')
      return res.json()
    },
  })
  const snapshots = snapshotsData?.snapshots || []

  // ---- Edit snapshot dialog ----
  const [editSnap, setEditSnap] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const openEdit = (s: any) => {
    setEditSnap(s)
    setEditForm({ name: s.name, status: s.status, payloadJson: JSON.stringify(s.payload, null, 2) })
  }

  const saveEdit = useMutation({
    mutationFn: async () => {
      let payload: any
      try {
        payload = JSON.parse(editForm.payloadJson)
      } catch (e: any) {
        throw new Error('Invalid JSON payload: ' + e.message)
      }
      const res = await fetch(`/api/sow-snapshots/${editSnap.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, status: editForm.status, payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sow-snapshots'] })
      toast.success('SOW saved')
      setEditSnap(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // ---- Delete snapshot ----
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

  // ---- Download as Word ----
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

  // ---- AI generator dialog ----
  const [showAI, setShowAI] = useState(false)
  const [aiBrief, setAiBrief] = useState('')
  const [aiContext, setAiContext] = useState<'service' | 'task' | 'spec' | 'overview' | 'general'>('service')
  const [aiResult, setAiResult] = useState('')
  const [aiProvider, setAiProvider] = useState('')

  const runAI = useMutation({
    mutationFn: async () => {
      const r = await generateSowContent({ brief: aiBrief, context: aiContext })
      return r
    },
    onSuccess: (r) => {
      setAiResult(r.content)
      setAiProvider(r.provider)
      if (r.provider === 'fallback') {
        toast.info('No LLM configured — used structured fallback. Edit as needed.')
      } else {
        toast.success(`Generated via ${r.provider}`)
      }
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <FileText className="h-5 w-5" />
          {t('admin.sow.title')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.sow.subtitle')}</p>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={() => setShowAI(true)} style={{ background: ORCHID, color: '#fff' }}>
          <Wand2 className="h-4 w-4 mr-2" />
          {t('admin.ai.generate')}
        </Button>
      </div>

      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader>
          <CardTitle style={{ color: ORCHID }}>Saved SOWs</CardTitle>
          <CardDescription>{snapshots.length} SOW documents on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
          ) : snapshots.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
              <p className="text-sm italic" style={{ color: JET }}>
                No SOWs saved yet. Users can save SOWs from the SOW Builder (Set Up tab → SOW → Form).
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
                    <div className="flex items-center gap-2">
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
                    <Button size="sm" variant="ghost" onClick={() => downloadWord(s)} title="Download Word" className="h-8 w-8 p-0" style={{ color: ORCHID }}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Edit" className="h-8 w-8 p-0" style={{ color: ORCHID }}>
                      <Edit className="h-4 w-4" />
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
      </Card>

      {/* ===== AI generator dialog ===== */}
      <Dialog open={showAI} onOpenChange={setShowAI}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>
              <Wand2 className="h-5 w-5 inline mr-2" />
              {t('admin.ai.generate')}
            </DialogTitle>
            <DialogDescription>{t('admin.ai.generateHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Section type</Label>
              <div className="flex flex-wrap gap-2">
                {(['service', 'task', 'spec', 'overview', 'general'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAiContext(c)}
                    className="rounded-full px-3 py-1 text-xs font-medium border-2"
                    style={{
                      background: aiContext === c ? ORCHID : '#fff',
                      color: aiContext === c ? '#fff' : JET,
                      borderColor: ORCHID,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Brief</Label>
              <Textarea
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                placeholder={t('admin.ai.briefPlaceholder')}
                rows={4}
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <Button
              onClick={() => runAI.mutate()}
              disabled={runAI.isPending || !aiBrief.trim()}
              style={{ background: ORCHID, color: '#fff' }}
            >
              {runAI.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> {t('admin.ai.generate')}</>
              )}
            </Button>
            {aiResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase" style={{ color: JET }}>Result</Label>
                  {aiProvider && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: LAVENDER, color: JET, background: '#fff' }}>
                      via {aiProvider}
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={aiResult}
                  onChange={(e) => setAiResult(e.target.value)}
                  rows={10}
                  style={{ borderColor: LAVENDER, fontFamily: 'monospace' }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { navigator.clipboard.writeText(aiResult); toast.success('Copied to clipboard') }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Edit snapshot dialog ===== */}
      <Dialog open={!!editSnap} onOpenChange={(open) => !open && setEditSnap(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>Edit SOW</DialogTitle>
            <DialogDescription>{editSnap?.owner?.email}</DialogDescription>
          </DialogHeader>
          {editSnap && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>Name</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>Status</Label>
                  <Input
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    placeholder="draft | submitted | approved | rejected"
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase" style={{ color: JET }}>Payload (JSON)</Label>
                <Textarea
                  value={editForm.payloadJson || ''}
                  onChange={(e) => setEditForm({ ...editForm, payloadJson: e.target.value })}
                  rows={14}
                  style={{ borderColor: LAVENDER, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSnap(null)}>{t('general.cancel')}</Button>
            <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} style={{ background: ORCHID, color: '#fff' }}>
              {saveEdit.isPending ? 'Saving…' : t('profile.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
