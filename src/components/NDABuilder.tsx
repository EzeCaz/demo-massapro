'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Download, FileText, Plus, Trash2, Save } from 'lucide-react'
import { exportNdaWord } from '@/lib/nda-export'
import { NDACoverInfo, DEFAULT_NDA_COVER, NDA_SECTIONS } from '@/lib/nda-data'

const ORCHID = '#7F39FB'
const JET = '#0A0711'
const LAVENDER = '#E9D5FF'
const WHITE = '#FFFFFF'
const DARK_INDIGO = '#241445'

const STORAGE_KEY = 'massapro-nda-state-v1'
const MASSAPRO_LOGO_URL = '/massapro-logo.png'

export default function NDABuilder({ snapshotId }: { snapshotId?: string } = {}) {
  const { t } = useLanguage()
  const [cover, setCover] = useState<NDACoverInfo>(DEFAULT_NDA_COVER)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  // Hydrate from localStorage or platform snapshot
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (snapshotId) {
        try {
          const res = await fetch(`/api/nda-snapshots/${snapshotId}`)
          if (!res.ok) throw new Error('Failed')
          const data = await res.json()
          if (cancelled) return
          if (data.snapshot?.payload) {
            setCover({ ...DEFAULT_NDA_COVER, ...data.snapshot.payload.cover })
          }
        } catch {}
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (!cancelled) setCover({ ...DEFAULT_NDA_COVER, ...parsed })
          }
        } catch {}
      }
      setHydrated(true)
    }
    hydrate()
    return () => { cancelled = true }
  }, [snapshotId])

  // Persist to localStorage on changes (only when not editing a snapshot)
  useEffect(() => {
    if (!hydrated || snapshotId) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cover))
    } catch {}
  }, [cover, hydrated, snapshotId])

  const update = useCallback((field: keyof NDACoverInfo, value: any) => {
    setCover((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateAnnexItem = (index: number, value: string) => {
    setCover((prev) => {
      const items = [...prev.annexItems]
      items[index] = value
      return { ...prev, annexItems: items }
    })
  }

  const addAnnexItem = () => {
    setCover((prev) => ({ ...prev, annexItems: [...prev.annexItems, ''] }))
  }

  const removeAnnexItem = (index: number) => {
    setCover((prev) => ({
      ...prev,
      annexItems: prev.annexItems.filter((_, i) => i !== index),
    }))
  }

  // Save to platform
  const saveToPlatform = useCallback(async () => {
    if (!snapshotId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/nda-snapshots/${snapshotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Mutual NDA — ${cover.recipientName || 'Recipient'}`,
          status: 'draft',
          payload: { cover },
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('NDA saved to platform')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [snapshotId, cover])

  // Export Word
  const handleExportWord = useCallback(async () => {
    try {
      await exportNdaWord({ cover }, MASSAPRO_LOGO_URL)
      toast.success('NDA downloaded as Word')
    } catch (err: any) {
      toast.error('Export failed: ' + (err?.message || 'unknown error'))
    }
  }, [cover])

  // Export PDF (uses the platform PDF route)
  const handleExportPDF = useCallback(() => {
    if (!snapshotId) {
      toast.info('PDF export requires a saved NDA. Click "Save to platform" first.')
      return
    }
    saveToPlatform().then(() => {
      window.open(`/api/nda-snapshots/${snapshotId}/pdf`, '_blank')
    })
  }, [snapshotId, saveToPlatform])

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading NDA Builder…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: ORCHID }}>
            <FileText className="h-6 w-6" />
            Mutual NDA Builder
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Non-Disclosure &amp; Non-Circumvention Agreement — editable template
          </p>
        </div>
        <div className="flex items-center gap-2">
          {snapshotId && (
            <Button variant="outline" size="sm" onClick={saveToPlatform} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportWord} style={{ borderColor: ORCHID, color: ORCHID }}>
            <Download className="h-4 w-4 mr-1.5" />
            Word
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} style={{ borderColor: '#EF4444', color: '#EF4444' }}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Sinba Party Details */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle style={{ color: ORCHID }}>Sinba Party Details</CardTitle>
          <CardDescription>The disclosing party (usually fixed)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Company Name</Label>
              <Input value={cover.sinbaName} onChange={(e) => update('sinbaName', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Entity Type</Label>
              <Input value={cover.sinbaEntityType} onChange={(e) => update('sinbaEntityType', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Registration Number</Label>
              <Input value={cover.sinbaRegistrationNumber} onChange={(e) => update('sinbaRegistrationNumber', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Email</Label>
              <Input value={cover.sinbaEmail} onChange={(e) => update('sinbaEmail', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label style={{ color: JET }}>Address</Label>
              <Input value={cover.sinbaAddress} onChange={(e) => update('sinbaAddress', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Party Details */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle style={{ color: ORCHID }}>Recipient Party Details</CardTitle>
          <CardDescription>The receiving party — fill in the recipient's information</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label style={{ color: JET }}>Recipient Type</Label>
              <Select value={cover.recipientType} onValueChange={(v) => update('recipientType', v)}>
                <SelectTrigger style={{ borderColor: LAVENDER }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate Entity</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label style={{ color: JET }}>
                {cover.recipientType === 'individual' ? 'Full Name' : 'Company Name'}
              </Label>
              <Input
                value={cover.recipientName}
                onChange={(e) => update('recipientName', e.target.value)}
                placeholder={cover.recipientType === 'individual' ? 'e.g., John Smith' : 'e.g., Acme Inc.'}
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>
                {cover.recipientType === 'individual' ? 'ID / Passport No.' : 'Registration No.'}
              </Label>
              <Input
                value={cover.recipientIdOrPassport}
                onChange={(e) => update('recipientIdOrPassport', e.target.value)}
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Email</Label>
              <Input
                value={cover.recipientEmail}
                onChange={(e) => update('recipientEmail', e.target.value)}
                placeholder="recipient@example.com"
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label style={{ color: JET }}>
                {cover.recipientType === 'individual' ? 'Residence Address' : 'Principal Address / Jurisdiction'}
              </Label>
              <Input
                value={cover.recipientAddress}
                onChange={(e) => update('recipientAddress', e.target.value)}
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement Metadata */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle style={{ color: ORCHID }}>Agreement Details</CardTitle>
          <CardDescription>Effective date and signatory information</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Effective Date</Label>
              <Input type="date" value={cover.effectiveDate} onChange={(e) => update('effectiveDate', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div />
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Sinba Signatory Name</Label>
              <Input value={cover.sinbaSignatoryName} onChange={(e) => update('sinbaSignatoryName', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Sinba Signatory Title</Label>
              <Input value={cover.sinbaSignatoryTitle} onChange={(e) => update('sinbaSignatoryTitle', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Sinba Signing Date</Label>
              <Input type="date" value={cover.sinbaSignatoryDate} onChange={(e) => update('sinbaSignatoryDate', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Recipient Signatory Name</Label>
              <Input value={cover.recipientSignatoryName} onChange={(e) => update('recipientSignatoryName', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Recipient Signatory Title</Label>
              <Input value={cover.recipientSignatoryTitle} onChange={(e) => update('recipientSignatoryTitle', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: JET }}>Recipient Signing Date</Label>
              <Input type="date" value={cover.recipientSignatoryDate} onChange={(e) => update('recipientSignatoryDate', e.target.value)} style={{ borderColor: LAVENDER }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annex 1 — Tech Platforms & Providers */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: ORCHID }}>Annex 1 — Tech Platforms &amp; Providers</CardTitle>
              <CardDescription>List of tech platforms, AI providers, software, and partner brands</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addAnnexItem} style={{ borderColor: ORCHID, color: ORCHID }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          {cover.annexItems.length === 0 ? (
            <p className="text-sm italic text-muted-foreground text-center py-4">
              No annex items. Click "Add Item" to add a tech platform or provider.
            </p>
          ) : (
            cover.annexItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm font-bold mt-2.5" style={{ color: ORCHID }}>{i + 1}.</span>
                <Textarea
                  value={item}
                  onChange={(e) => updateAnnexItem(i, e.target.value)}
                  className="flex-1"
                  rows={2}
                  style={{ borderColor: LAVENDER }}
                />
                <Button size="sm" variant="ghost" onClick={() => removeAnnexItem(i)} className="mt-1" style={{ color: '#EF4444' }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview — Section List */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle style={{ color: ORCHID }}>Document Sections</CardTitle>
          <CardDescription>The NDA contains {NDA_SECTIONS.length} numbered sections plus the Annex</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-1">
            {NDA_SECTIONS.map((sec) => (
              <div key={sec.number} className="flex items-center gap-3 text-sm py-1.5 border-b" style={{ borderColor: LAVENDER }}>
                <span className="font-bold" style={{ color: ORCHID }}>{sec.number}.</span>
                <span style={{ color: JET }}>{sec.title}</span>
                <span className="ml-auto text-xs" style={{ color: JET, opacity: 0.6 }}>{sec.paragraphs.length} para.</span>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm py-1.5">
              <span className="font-bold" style={{ color: ORCHID }}>★</span>
              <span style={{ color: JET }}>Annex 1 — Tech Platforms &amp; Providers</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
