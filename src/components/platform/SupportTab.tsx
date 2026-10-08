'use client'

import { useState, useRef, useCallback } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  LifeBuoy, Paperclip, X, Plus, Send, AlertTriangle, AlertCircle, Clock, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

type Priority = 'low' | 'normal' | 'high' | 'critical'

const PRIORITY_META: Record<Priority, { color: string; bg: string; icon: React.ReactNode }> = {
  low: { color: '#10B981', bg: '#D1FAE5', icon: <ArrowDown className="h-3 w-3" /> },
  normal: { color: '#3B82F6', bg: '#DBEAFE', icon: <Clock className="h-3 w-3" /> },
  high: { color: '#F59E0B', bg: '#FEF3C7', icon: <AlertCircle className="h-3 w-3" /> },
  critical: { color: '#EF4444', bg: '#FEE2E2', icon: <AlertTriangle className="h-3 w-3" /> },
}

// SupportTab — the Support tab of the platform.
//
// Two parts:
//  1) "Submit support request" form (the form described in the user's brief):
//     - CC email + "Add email" button
//     - Subject
//     - Description with the placeholder text
//     - Priority: Low / Normal / High / Critical (with descriptions)
//     - Attachments: "No file chosen", "Add file or drop files here"
//
//  2) "My tickets" list (tickets the user submitted, or all tickets for admins)
export default function SupportTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  // ---- Form state ---------------------------------------------------------
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [ccInput, setCcInput] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Tickets list state -------------------------------------------------
  const [viewTicket, setViewTicket] = useState<any | null>(null)

  // ---- Form submission ----------------------------------------------------
  const submitMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.set('title', t('support.title'))
      fd.set('subject', subject)
      fd.set('description', description)
      fd.set('priority', priority)
      fd.set('ccEmails', JSON.stringify(ccEmails))
      files.forEach((f) => fd.append('files', f))
      const res = await fetch('/api/support-tickets', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed to submit ticket')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('support.submitted'))
      setSubject('')
      setDescription('')
      setCcEmails([])
      setFiles([])
      setPriority('normal')
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required')
      return
    }
    submitMutation.mutate()
  }

  // ---- CC email handlers --------------------------------------------------
  const addCcEmail = () => {
    const v = ccInput.trim().toLowerCase()
    if (!v) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error('Invalid email')
      return
    }
    if (ccEmails.includes(v)) {
      toast.error('Email already in CC list')
      return
    }
    setCcEmails((prev) => [...prev, v])
    setCcInput('')
  }

  const removeCcEmail = (e: string) => setCcEmails((prev) => prev.filter((x) => x !== e))

  // ---- File handlers ------------------------------------------------------
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    if (arr.length > 10) {
      toast.error('Max 10 files per ticket')
      return
    }
    for (const f of arr) {
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds 8MB limit`)
        return
      }
    }
    setFiles((prev) => {
      const merged = [...prev, ...arr].slice(0, 10)
      return merged
    })
  }, [])

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  // ---- Tickets list query -------------------------------------------------
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support-tickets')
      if (!res.ok) throw new Error('Failed to load tickets')
      return res.json()
    },
  })
  const tickets = ticketsData?.tickets || []

  return (
    <div className="space-y-6">
      {/* ===== Submit form ===== */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
            <LifeBuoy className="h-5 w-5" />
            {t('support.title')}
          </CardTitle>
          <CardDescription>{t('support.descriptionPlaceholder')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* CC emails */}
            <div className="space-y-2">
              <Label style={{ color: JET }}>{t('support.ccEmails')}</Label>
              <div className="flex flex-wrap gap-2 items-center">
                {ccEmails.map((e) => (
                  <Badge
                    key={e}
                    className="inline-flex items-center gap-1.5"
                    style={{ background: LAVENDER, color: JET, border: `1px solid ${ORCHID}33` }}
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => removeCcEmail(e)}
                      className="hover:opacity-70"
                      aria-label={t('support.ccRemove')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex gap-1.5 flex-1 min-w-[200px]">
                  <Input
                    type="email"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCcEmail() } }}
                    placeholder={t('support.ccPlaceholder')}
                    className="flex-1"
                    style={{ borderColor: LAVENDER }}
                  />
                  <Button type="button" variant="outline" onClick={addCcEmail} style={{ borderColor: ORCHID, color: ORCHID }}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('support.ccAdd')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label style={{ color: JET }}>{t('support.subject')}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('support.subjectPlaceholder')}
                required
                style={{ borderColor: LAVENDER }}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label style={{ color: JET }}>{t('support.description')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('support.descriptionPlaceholder')}
                rows={6}
                required
                style={{ borderColor: LAVENDER }}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label style={{ color: JET }}>{t('support.priority')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(['low', 'normal', 'high', 'critical'] as Priority[]).map((p) => {
                  const meta = PRIORITY_META[p]
                  const active = priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'rounded-lg border-2 p-3 text-start transition-all',
                        'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1'
                      )}
                      style={{
                        borderColor: active ? meta.color : LAVENDER,
                        background: active ? meta.bg : WHITE,
                        boxShadow: active ? `0 1px 0 0 ${meta.color}33` : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-md p-1" style={{ background: meta.color, color: WHITE }}>
                          {meta.icon}
                        </span>
                        <span className="font-semibold text-sm" style={{ color: JET }}>
                          {t(`support.priority.${p}`)}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: JET, opacity: 0.75 }}>
                        {t(`support.priority.${p}Desc`)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label style={{ color: JET }}>{t('support.attachments')}</Label>
              <div
                className={cn(
                  'rounded-lg border-2 border-dashed p-4 transition-all',
                  isDragOver && 'bg-violet-50'
                )}
                style={{
                  borderColor: isDragOver ? ORCHID : LAVENDER,
                  background: isDragOver ? LAVENDER : WHITE,
                }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
                />
                {files.length === 0 ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm" style={{ color: JET, opacity: 0.7 }}>
                      {t('support.attachments.none')}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ borderColor: ORCHID, color: ORCHID }}
                    >
                      <Paperclip className="h-4 w-4 mr-1.5" />
                      {t('support.attachments.add')}
                    </Button>
                    <span className="text-xs" style={{ color: JET, opacity: 0.6 }}>
                      {t('support.attachments.drop')}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md p-2" style={{ background: LAVENDER }}>
                        <Paperclip className="h-4 w-4 flex-shrink-0" style={{ color: ORCHID }} />
                        <span className="text-sm flex-1 truncate" style={{ color: JET }}>{f.name}</span>
                        <span className="text-xs" style={{ color: JET, opacity: 0.6 }}>
                          {(f.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="hover:opacity-70"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" style={{ color: '#EF4444' }} />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ borderColor: ORCHID, color: ORCHID }}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t('support.attachments.add')}
                    </Button>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: JET, opacity: 0.6 }}>
                  {t('support.attachments.limit')}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                style={{ background: ORCHID, color: WHITE }}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Sending…' : t('support.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ===== Tickets list ===== */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle style={{ color: ORCHID }}>{t('support.tickets')}</CardTitle>
          <CardDescription>{t('support.tickets.all')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
              <p className="text-sm italic" style={{ color: JET }}>{t('support.tickets.empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((tk: any) => {
                const meta = PRIORITY_META[tk.priority as Priority] || PRIORITY_META.normal
                return (
                  <button
                    key={tk.id}
                    type="button"
                    onClick={() => setViewTicket(tk)}
                    className="w-full text-start rounded-lg border-2 p-3 hover:shadow-md transition-all"
                    style={{ borderColor: LAVENDER, background: WHITE }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm" style={{ color: JET }}>
                          {tk.subject}
                        </span>
                        <span className="text-xs block mt-0.5" style={{ color: JET, opacity: 0.65 }}>
                          {new Date(tk.createdAt).toLocaleDateString()} · {tk.submittedBy?.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs" style={{ borderColor: meta.color, color: meta.color }}>
                          {meta.icon} {t(`support.priority.${tk.priority}`)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t(`support.tickets.${tk.status === 'in_progress' ? 'inProgress' : tk.status}`)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Ticket detail dialog ===== */}
      <Dialog open={!!viewTicket} onOpenChange={(open) => !open && setViewTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>{viewTicket?.subject}</DialogTitle>
            <DialogDescription>
              {viewTicket && new Date(viewTicket.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {t(`support.priority.${viewTicket.priority}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`support.tickets.${viewTicket.status === 'in_progress' ? 'inProgress' : viewTicket.status}`)}
                </Badge>
                {viewTicket.assignedTo && (
                  <Badge variant="outline" className="text-xs">
                    {t('support.assignedTo')}: {viewTicket.assignedTo.name || viewTicket.assignedTo.email}
                  </Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: JET }}>
                {viewTicket.description}
              </p>
              {viewTicket.ccEmails && Array.isArray(viewTicket.ccEmails) && viewTicket.ccEmails.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase" style={{ color: JET }}>
                    {t('support.ccEmails')}:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewTicket.ccEmails.map((e: string) => (
                      <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewTicket.attachments && viewTicket.attachments.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase" style={{ color: JET }}>
                    {t('support.attachments')}:
                  </span>
                  <div className="space-y-1 mt-1">
                    {viewTicket.attachments.map((a: any) => (
                      <a
                        key={a.id}
                        href={`/api/support-tickets/${viewTicket.id}/attachments?attachmentId=${a.id}`}
                        className="block text-sm hover:underline"
                        style={{ color: ORCHID }}
                      >
                        <Paperclip className="h-3 w-3 inline mr-1.5" />
                        {a.fileName} ({(a.fileSize / 1024).toFixed(1)} KB)
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
