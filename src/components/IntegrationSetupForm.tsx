'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Loader2, Save, Send, ArrowLeft, Trash2, Languages, Check, Share2, Copy, Plus,
} from 'lucide-react'
import { INTEGRATION_FIELDS } from '@/lib/integration-fields'

interface IntegrationSetupFormProps {
  setupId: string
}

// 28 base field keys — same order as in the i18n labels.
const FIELDS = INTEGRATION_FIELDS

export default function IntegrationSetupForm({ setupId }: IntegrationSetupFormProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { data: session } = useSession()
  const [setup, setSetup] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  // Share dialog state (owner-only)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareAccess, setShareAccess] = useState<'view' | 'edit'>('view')
  const [shareCreating, setShareCreating] = useState(false)
  const [shares, setShares] = useState<any[]>([])
  const [lastMagicLink, setLastMagicLink] = useState<string | null>(null)

  // Is the current session a share session? (role === 'share')
  // Share users can't submit/delete/share — only edit (if accessLevel=edit)
  // or view (if view) the single setup the token was issued for.
  const isShareSession = (session?.user as any)?.role === 'share'
  const shareAccessLevel = (session?.user as any)?.shareAccessLevel
  const readOnly = isShareSession && shareAccessLevel !== 'edit'

  // Load the setup once on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/integration-setups/${setupId}`)
        if (!res.ok) {
          if (res.status === 403 || res.status === 404) {
            setError(res.status === 404 ? 'Setup not found' : 'Access denied')
          } else {
            setError('Failed to load setup')
          }
          return
        }
        const data = await res.json()
        if (cancelled) return
        setSetup(data)
        setFormData(data)
      } catch (e) {
        if (!cancelled) setError('Failed to load setup')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [setupId])

  // Auto-save a single field with debounce. We send only the changed
  // field to minimize the payload and avoid stomping concurrent edits.
  const saveField = useCallback(async (fieldName: string, value: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/integration-setups/${setupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: value }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSavedTick(true)
      setTimeout(() => setSavedTick(false), 1500)
    } catch (e) {
      toast.error(t('integration.error'))
    } finally {
      setSaving(false)
    }
  }, [setupId, t])

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    setDirty(prev => new Set(prev).add(fieldName))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveField(fieldName, value)
      setDirty(prev => { const s = new Set(prev); s.delete(fieldName); return s })
    }, 800)
  }, [saveField])

  const handleSubmit = async () => {
    try {
      const res = await fetch(`/api/integration-setups/${setupId}/submit`, { method: 'POST' })
      if (!res.ok) throw new Error('Submit failed')
      toast.success(t('integration.submittedMsg'))
      // Refresh local state
      const updated = await fetch(`/api/integration-setups/${setupId}`).then(r => r.json())
      setSetup(updated)
      setFormData(updated)
    } catch (e) {
      toast.error(t('integration.error'))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('general.confirm'))) return
    try {
      const res = await fetch(`/api/integration-setups/${setupId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success(t('integration.deleted'))
      router.push('/integration-setup')
    } catch (e) {
      toast.error(t('integration.error'))
    }
  }

  // ===== Share handlers (owner-only) =====

  // Load existing shares when the dialog opens.
  const loadShares = useCallback(async () => {
    try {
      const res = await fetch(`/api/integration-setups/${setupId}/shares`)
      if (!res.ok) throw new Error('Failed to load shares')
      const data = await res.json()
      setShares(data)
    } catch (e) {
      console.error('loadShares failed', e)
    }
  }, [setupId])

  const handleOpenShare = () => {
    setShareOpen(true)
    setLastMagicLink(null)
    setShareEmail('')
    setShareAccess('view')
    loadShares()
  }

  const handleCreateShare = async () => {
    const email = shareEmail.trim().toLowerCase()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Please enter a valid email')
      return
    }
    setShareCreating(true)
    try {
      const res = await fetch(`/api/integration-setups/${setupId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessLevel: shareAccess }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create share' }))
        throw new Error(data.error || 'Failed to create share')
      }
      const data = await res.json()
      setLastMagicLink(data.magicLink)
      setShareEmail('')
      toast.success(data.emailSent
        ? `Invitation sent to ${email}`
        : `Share created — copy the link below`)
      loadShares()
    } catch (e: any) {
      toast.error(e.message || t('integration.error'))
    } finally {
      setShareCreating(false)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm(t('general.confirm'))) return
    try {
      const res = await fetch(`/api/integration-setups/${setupId}/shares?shareId=${shareId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to revoke share')
      toast.success('Share revoked')
      loadShares()
    } catch (e) {
      toast.error(t('integration.error'))
    }
  }

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => toast.success('Copied to clipboard'),
        () => toast.error('Copy failed — select and copy manually')
      )
    }
  }

  // Download a PDF of this setup (owner only — share users can use the
  // "Download PDF" button on the share page banner if we add one).
  const handleDownloadPdf = () => {
    const lang = (typeof window !== 'undefined' && localStorage.getItem('massapro-language')) || 'original'
    window.open(`/api/integration-setups/${setupId}/pdf?lang=${lang}`, '_blank')
  }

  // Auto-translate all empty fields: source = base, target = En, Es, He.
  // Calls the translate endpoint for each target language separately so
  // partial failures don't lose progress.
  const handleAutoTranslate = async () => {
    setTranslating(true)
    try {
      // Auto-detect source: prefer base field, fall back to Es/En/He.
      // For each direction (x-to-y), the API will pick the source variant
      // (lang-specific first, then base) automatically.
      const directions = [
        'en-to-es', 'en-to-he',
        'es-to-en', 'es-to-he',
        'he-to-en', 'he-to-es',
      ]
      // For a simple auto-translate-all: use 'en-to-es', 'en-to-he' if base
      // is in English; otherwise use the first non-empty variant as source.
      // Heuristic: try each direction once, in order; the API skips empty
      // sources and skips when the target is already populated only if
      // the source is empty (we still overwrite on subsequent runs — that's
      // fine for the user's "translate everything" intent).
      const targetDirections = ['en-to-es', 'en-to-he']
      // Also cover "es-to-en" if base is Spanish and En is empty.
      // The translate endpoint reads from the source-suffix field first,
      // falling back to the base — so we can safely try all 6 directions.
      const allDirections = ['en-to-es', 'en-to-he', 'es-to-en', 'es-to-he', 'he-to-en', 'he-to-es']

      let anyOk = false
      for (const direction of allDirections) {
        const res = await fetch(`/api/integration-setups/${setupId}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: FIELDS, direction }),
        })
        if (res.ok) {
          anyOk = true
        }
      }
      if (anyOk) {
        toast.success(t('integration.translate') + ' OK')
        const updated = await fetch(`/api/integration-setups/${setupId}`).then(r => r.json())
        setSetup(updated)
        setFormData(updated)
      } else {
        toast.error(t('integration.error'))
      }
    } catch (e) {
      toast.error(t('integration.error'))
    } finally {
      setTranslating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-vivid-blue" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/integration-setup')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {t('integration.title')}
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!setup) return null

  const isSubmitted = setup.status === 'submitted'

  return (
    <div className="space-y-6">
      {/* Top row: back + status + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Share users don't get a Back button (there's nothing to go back to). */}
          {!isShareSession && (
            <Button variant="outline" size="sm" onClick={() => router.push('/integration-setup')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
          )}
          <Input
            value={formData.name || ''}
            onChange={e => handleFieldChange('name', e.target.value)}
            className="text-lg font-semibold w-[280px]"
            placeholder={t('integration.namePlaceholder')}
            disabled={isShareSession || isSubmitted}
          />
          <Badge variant={isSubmitted ? 'default' : 'secondary'} className={isSubmitted ? 'bg-emerald text-white' : ''}>
            {isSubmitted ? t('integration.submitted') : t('integration.draft')}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('integration.saving')}
            </span>
          )}
          {savedTick && !saving && (
            <span className="text-sm text-emerald flex items-center gap-1">
              <Check className="h-3 w-3" /> {t('integration.saved')}
            </span>
          )}
          {translating && (
            <span className="text-sm text-vivid-blue flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('integration.translating')}
            </span>
          )}
          {/* Translate is available to share editors too */}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={handleAutoTranslate} disabled={translating || isSubmitted}>
              {translating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Languages className="h-4 w-4 mr-1" />}
              {t('integration.translate')}
            </Button>
          )}
          {/* Download PDF — both owners and share users can download a
              read-only PDF of the setup (the API enforces scope). */}
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            {t('integration.exportPdf')}
          </Button>
          {/* Share — owner only */}
          {!isShareSession && (
            <Button variant="outline" size="sm" onClick={handleOpenShare}>
              <Share2 className="h-4 w-4 mr-1" /> {t('integration.share')}
            </Button>
          )}
          {/* Submit + Delete — owner only */}
          {!isShareSession && !isSubmitted && (
            <Button size="sm" onClick={handleSubmit} className="bg-emerald hover:bg-emerald/90">
              <Send className="h-4 w-4 mr-1" /> {t('integration.submit')}
            </Button>
          )}
          {!isShareSession && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Form fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('integration.fieldsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {FIELDS.map((fieldKey, idx) => (
            <div key={fieldKey} className="space-y-2">
              <Label className="text-sm font-medium flex items-start gap-2">
                <span className="text-muted-foreground font-normal text-xs mt-0.5 flex-shrink-0">{idx + 1}.</span>
                <span>{t(`integration.field.${fieldKey}`)}</span>
              </Label>
              <Textarea
                value={formData[fieldKey] || ''}
                onChange={e => handleFieldChange(fieldKey, e.target.value)}
                placeholder={t(`integration.field.${fieldKey}`)}
                className="min-h-[80px]"
                disabled={isSubmitted || readOnly}
              />
              {idx < FIELDS.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ===== Share dialog (owner-only) ===== */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-vivid-blue" />
              {t('integration.shareTitle')}
            </DialogTitle>
            <DialogDescription>{t('integration.shareDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* New share form */}
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('integration.shareEmailLabel')}</Label>
                <Input
                  type="email"
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  placeholder={t('integration.shareEmailPlaceholder')}
                  onKeyDown={e => { if (e.key === 'Enter' && !shareCreating) handleCreateShare() }}
                />
                <p className="text-xs text-muted-foreground">{t('integration.shareEmailHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('integration.shareAccessLabel')}</Label>
                <Select value={shareAccess} onValueChange={(v) => setShareAccess(v as 'view' | 'edit')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">{t('integration.shareAccessView')}</SelectItem>
                    <SelectItem value="edit">{t('integration.shareAccessEdit')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateShare} disabled={shareCreating} className="w-full bg-vivid-blue hover:bg-blue-700">
                {shareCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                {t('integration.shareCreate')}
              </Button>
            </div>

            {/* Newly created share magic link — show once after creation */}
            {lastMagicLink && (
              <div className="border-2 border-vivid-blue rounded-md p-3 space-y-2 bg-vivid-blue/5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-vivid-blue">{t('integration.shareLinkReady')}</Label>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(lastMagicLink)}>
                    <Copy className="h-3 w-3 mr-1" /> {t('integration.shareCopy')}
                  </Button>
                </div>
                <code className="block text-xs break-all bg-background p-2 rounded border">
                  {lastMagicLink}
                </code>
                <p className="text-xs text-muted-foreground">{t('integration.shareLinkHint')}</p>
              </div>
            )}

            {/* Existing shares list */}
            {shares.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('integration.shareExisting')}</Label>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {shares.map((share: any) => (
                    <div key={share.id} className="flex items-center justify-between gap-2 p-2 border rounded-md text-sm">
                      <div className="min-w-0 flex items-center gap-2">
                        <Badge variant={share.accessLevel === 'edit' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                          {share.accessLevel === 'edit' ? 'Edit' : 'View'}
                        </Badge>
                        <span className="truncate">{share.email}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/s/${share.token}`)}
                          className="h-7"
                          title={t('integration.shareCopy')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeShare(share.id)}
                          className="text-destructive hover:text-destructive h-7"
                          title="Revoke"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
