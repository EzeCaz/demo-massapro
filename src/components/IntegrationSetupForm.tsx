'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Loader2, Save, Send, ArrowLeft, Trash2, Languages, Check,
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
  const [setup, setSetup] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [dirty, setDirty] = useState<Set<string>>(new Set())

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
          <Button variant="outline" size="sm" onClick={() => router.push('/integration-setup')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
          </Button>
          <Input
            value={formData.name || ''}
            onChange={e => handleFieldChange('name', e.target.value)}
            className="text-lg font-semibold w-[280px]"
            placeholder={t('integration.namePlaceholder')}
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
          <Button variant="outline" size="sm" onClick={handleAutoTranslate} disabled={translating || isSubmitted}>
            {translating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Languages className="h-4 w-4 mr-1" />}
            {t('integration.translate')}
          </Button>
          {!isSubmitted && (
            <Button size="sm" onClick={handleSubmit} className="bg-emerald hover:bg-emerald/90">
              <Send className="h-4 w-4 mr-1" /> {t('integration.submit')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
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
                disabled={isSubmitted}
              />
              {idx < FIELDS.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
