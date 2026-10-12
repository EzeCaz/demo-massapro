'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Download, FileText, Plus, Trash2, Save, PenTool, Clock, Mail, Send, Copy, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SignaturePad from '@/components/SignaturePad'
import { exportNdaWord } from '@/lib/nda-export'
import { NDACoverInfo, DEFAULT_NDA_COVER, NDA_SECTIONS } from '@/lib/nda-data'

const ORCHID = '#7F39FB'
const JET = '#0A0711'
const LAVENDER = '#E9D5FF'
const WHITE = '#FFFFFF'
const DARK_INDIGO = '#241445'

const STORAGE_KEY = 'massapro-nda-state-v1'
const MASSAPRO_LOGO_URL = '/massapro-logo.png'

export default function NDABuilder({ snapshotId: initialSnapshotId, inviteToken }: { snapshotId?: string; inviteToken?: string } = {}) {
  const [cover, setCover] = useState<NDACoverInfo>(DEFAULT_NDA_COVER)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | undefined>(initialSnapshotId)
  const [isInviteMode, setIsInviteMode] = useState(false)

  // Hydrate from localStorage, platform snapshot, or invite token
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (inviteToken) {
        // Invite mode — load NDA via share-lookup (no auth required)
        setIsInviteMode(true)
        try {
          const res = await fetch(`/api/nda-share-lookup?token=${inviteToken}`)
          if (!res.ok) throw new Error('Invalid invite')
          const data = await res.json()
          if (cancelled) return
          if (data?.snapshot?.payload?.cover) {
            setCover({ ...DEFAULT_NDA_COVER, ...data.snapshot.payload.cover })
          }
          if (data?.snapshot?.id) {
            setActiveSnapshotId(data.snapshot.id)
          }
        } catch {
          if (!cancelled) toast.error('Invalid or expired invite link')
        }
      } else if (initialSnapshotId) {
        try {
          const res = await fetch(`/api/nda-snapshots/${initialSnapshotId}`)
          if (!res.ok) throw new Error('Failed')
          const data = await res.json()
          if (cancelled) return
          if (data.snapshot?.payload?.cover) {
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
  }, [initialSnapshotId, inviteToken])

  // Persist to localStorage on changes (only when not editing a snapshot)
  useEffect(() => {
    if (!hydrated || activeSnapshotId) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cover))
    } catch {}
  }, [cover, hydrated, activeSnapshotId])

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

  // Save to platform — creates a new snapshot if none exists yet, otherwise
  // updates the existing one. Returns the snapshot ID so the PDF export can
  // use it immediately.
  // CRITICAL: preserves existing payload fields (signatures, invites, etc.)
  // by merging the cover with the existing payload, NOT overwriting it.
  const saveToPlatform = useCallback(async (): Promise<string | null> => {
    setSaving(true)
    try {
      const name = `Mutual NDA — ${cover.recipientName || 'Recipient'}`
      // Build the payload — preserve existing signatures/invites by
      // fetching the current payload first (if updating an existing snapshot)
      let existingPayload: any = {}
      if (activeSnapshotId) {
        try {
          const res = await fetch(`/api/nda-snapshots/${activeSnapshotId}`)
          if (res.ok) {
            const data = await res.json()
            existingPayload = data.snapshot?.payload || {}
          }
        } catch {}
      }
      // Merge: keep existing signatures + invites, update the cover
      const payload = {
        ...existingPayload,
        cover,
      }
      let snapshotId = activeSnapshotId
      if (snapshotId) {
        const res = await fetch(`/api/nda-snapshots/${snapshotId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, status: existingPayload.signatures?.sinba && existingPayload.signatures?.recipient ? 'signed' : (existingPayload.signatures?.sinba || existingPayload.signatures?.recipient ? 'sent' : 'draft'), payload }),
        })
        if (!res.ok) throw new Error('Failed to save')
        toast.success('NDA saved to platform')
      } else {
        const res = await fetch(`/api/nda-snapshots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, status: 'draft', payload }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        snapshotId = data.snapshot?.id
        setActiveSnapshotId(snapshotId)
        toast.success('NDA saved to platform')
      }
      return snapshotId
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
      return null
    } finally {
      setSaving(false)
    }
  }, [activeSnapshotId, cover])

  // Export Word
  const handleExportWord = useCallback(async () => {
    try {
      await exportNdaWord({ cover }, MASSAPRO_LOGO_URL)
      toast.success('NDA downloaded as Word')
    } catch (err: any) {
      console.error('Word export error:', err)
      toast.error('Export failed: ' + (err?.message || 'unknown error'))
    }
  }, [cover])

  // Export PDF — auto-saves first (creating a snapshot if needed), then opens
  // the PDF route with the snapshot ID.
  const handleExportPDF = useCallback(async () => {
    const snapshotId = await saveToPlatform()
    if (!snapshotId) {
      toast.error('Cannot export PDF — save failed first')
      return
    }
    window.open(`/api/nda-snapshots/${snapshotId}/pdf`, '_blank')
  }, [saveToPlatform])

  // ---- E-signature ----
  const [signing, setSigning] = useState(false)
  const [signatures, setSignatures] = useState<{
    sinba?: { signedBy: string; signedAt: string; signedByEmail: string; image?: string }
    recipient?: { signedBy: string; signedAt: string; signedByEmail: string; image?: string }
  }>({})
  // Signature images being drawn/uploaded (before signing)
  const [sigImages, setSigImages] = useState<{ sinba: string | null; recipient: string | null }>({
    sinba: null,
    recipient: null,
  })

  // Load existing signatures when a snapshot is active
  useEffect(() => {
    if (!activeSnapshotId) return
    fetch(`/api/nda-snapshots/${activeSnapshotId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.snapshot?.payload?.signatures) {
          setSignatures(data.snapshot.payload.signatures)
        }
      })
      .catch(() => {})
  }, [activeSnapshotId])

  const handleSign = useCallback(async (role: 'sinba' | 'recipient') => {
    const snapshotId = await saveToPlatform()
    if (!snapshotId) return
    setSigning(true)
    try {
      const signerName = role === 'sinba' ? cover.sinbaSignatoryName : cover.recipientSignatoryName
      const signatureImage = sigImages[role]
      const res = await fetch(`/api/nda-snapshots/${snapshotId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedBy: signerName, role, signatureImage }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Sign failed')
      setSignatures((prev) => ({ ...prev, [role]: data.signature }))
      // Clear the pending signature image
      setSigImages((prev) => ({ ...prev, [role]: null }))
      toast.success(`${role === 'sinba' ? 'Sinba' : 'Recipient'} signed the NDA`, {
        description: `Signed at ${new Date(data.signature.signedAt).toLocaleString()}`,
      })
    } catch (err: any) {
      toast.error(err.message || 'Sign failed')
    } finally {
      setSigning(false)
    }
  }, [saveToPlatform, cover, sigImages])

  // ---- Invite to sign ----
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  const handleInvite = useCallback(async () => {
    if (!inviteEmail) {
      toast.error('Please enter the recipient\'s email')
      return
    }
    const snapshotId = await saveToPlatform()
    if (!snapshotId) return
    setInviting(true)
    try {
      const res = await fetch(`/api/nda-snapshots/${snapshotId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Invite failed')
      setInviteUrl(data.inviteUrl)
      toast.success('Invite link generated', {
        description: `Share this link with ${inviteEmail} so they can sign the NDA`,
      })
    } catch (err: any) {
      toast.error(err.message || 'Invite failed')
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, saveToPlatform])

  // ---- Send signed copy ----
  const [sendEmail, setSendEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sentPdfUrl, setSentPdfUrl] = useState<string | null>(null)

  const handleSendSigned = useCallback(async () => {
    if (!sendEmail) {
      toast.error('Please enter the email to send the signed copy to')
      return
    }
    if (!activeSnapshotId) {
      toast.error('Save the NDA first')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/nda-snapshots/${activeSnapshotId}/send-signed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setSentPdfUrl(data.pdfUrl)
      toast.success('Signed copy ready', {
        description: data.message || `Signed PDF generated for ${sendEmail}`,
      })
    } catch (err: any) {
      toast.error(err.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }, [sendEmail, activeSnapshotId])

  // Copy to clipboard
  const [copied, setCopied] = useState(false)
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
          <Button variant="outline" size="sm" onClick={saveToPlatform} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
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

      {/* E-Signature Section */}
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
            <PenTool className="h-5 w-5" />
            E-Signature
          </CardTitle>
          <CardDescription>
            Sign the NDA electronically — draw your signature, upload an image, or click Sign. The timestamp is recorded automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sinba signature */}
            <div className="rounded-lg border p-4" style={{ borderColor: LAVENDER, background: signatures.sinba ? '#F0FDF4' : '#fff' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm" style={{ color: JET }}>SINBA GROUP ISRAEL LTD.</div>
                  <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                    Signatory: {cover.sinbaSignatoryName || '—'} · {cover.sinbaSignatoryTitle || '—'}
                  </div>
                </div>
                {signatures.sinba ? (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: '#10B981', color: '#10B981' }}>
                    <Clock className="h-3 w-3 mr-1" />
                    Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: LAVENDER, color: JET }}>
                    Pending
                  </Badge>
                )}
              </div>
              {signatures.sinba ? (
                <div className="space-y-3">
                  {/* Display the signature image if present */}
                  {signatures.sinba.image && (
                    <div className="rounded-lg border-2 p-2" style={{ borderColor: LAVENDER, background: '#fff' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signatures.sinba.image} alt="Sinba signature" className="max-h-20 mx-auto object-contain" />
                    </div>
                  )}
                  <div className="text-xs space-y-1" style={{ color: JET }}>
                    <div><strong>Signed by:</strong> {signatures.sinba.signedBy}</div>
                    <div><strong>Email:</strong> {signatures.sinba.signedByEmail}</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <strong>Signed at:</strong> {new Date(signatures.sinba.signedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <SignaturePad
                    value={sigImages.sinba}
                    onChange={(val) => setSigImages((prev) => ({ ...prev, sinba: val }))}
                    label="Draw or upload signature"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSign('sinba')}
                    disabled={signing || !cover.sinbaSignatoryName}
                    style={{ background: ORCHID, color: '#fff' }}
                  >
                    <PenTool className="h-4 w-4 mr-1.5" />
                    {signing ? 'Signing…' : 'Sign as Sinba'}
                  </Button>
                </div>
              )}
            </div>

            {/* Recipient signature */}
            <div className="rounded-lg border p-4" style={{ borderColor: LAVENDER, background: signatures.recipient ? '#F0FDF4' : '#fff' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm" style={{ color: JET }}>RECIPIENT</div>
                  <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                    Signatory: {cover.recipientSignatoryName || '—'} · {cover.recipientSignatoryTitle || '—'}
                  </div>
                </div>
                {signatures.recipient ? (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: '#10B981', color: '#10B981' }}>
                    <Clock className="h-3 w-3 mr-1" />
                    Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: LAVENDER, color: JET }}>
                    Pending
                  </Badge>
                )}
              </div>
              {signatures.recipient ? (
                <div className="space-y-3">
                  {signatures.recipient.image && (
                    <div className="rounded-lg border-2 p-2" style={{ borderColor: LAVENDER, background: '#fff' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signatures.recipient.image} alt="Recipient signature" className="max-h-20 mx-auto object-contain" />
                    </div>
                  )}
                  <div className="text-xs space-y-1" style={{ color: JET }}>
                    <div><strong>Signed by:</strong> {signatures.recipient.signedBy}</div>
                    <div><strong>Email:</strong> {signatures.recipient.signedByEmail}</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <strong>Signed at:</strong> {new Date(signatures.recipient.signedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <SignaturePad
                    value={sigImages.recipient}
                    onChange={(val) => setSigImages((prev) => ({ ...prev, recipient: val }))}
                    label="Draw or upload signature"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSign('recipient')}
                    disabled={signing || !cover.recipientSignatoryName}
                    style={{ background: ORCHID, color: '#fff' }}
                  >
                    <PenTool className="h-4 w-4 mr-1.5" />
                    {signing ? 'Signing…' : 'Sign as Recipient'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {signatures.sinba && signatures.recipient && (
            <div className="rounded-lg p-3 text-center" style={{ background: '#F0FDF4', border: '1px solid #10B981' }}>
              <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                ✓ Both parties have signed — this NDA is fully executed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite to Sign — only visible when not in invite mode */}
      {!isInviteMode && (
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Mail className="h-5 w-5" />
              Invite to Sign
            </CardTitle>
            <CardDescription>
              Generate a share link for the recipient to fill in their details, draw/upload their signature, and sign the NDA
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="recipient@example.com"
                style={{ borderColor: LAVENDER }}
                className="flex-1"
              />
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                style={{ background: ORCHID, color: '#fff' }}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                {inviting ? 'Generating…' : 'Generate Invite Link'}
              </Button>
            </div>
            {inviteUrl && (
              <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: LAVENDER, background: '#fff' }}>
                <div className="text-xs font-semibold uppercase" style={{ color: JET, opacity: 0.7 }}>
                  Share this link with {inviteEmail}:
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 truncate rounded px-2 py-1.5" style={{ background: LAVENDER, color: ORCHID }}>
                    {inviteUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(inviteUrl)}
                    style={{ borderColor: ORCHID, color: ORCHID }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs" style={{ color: JET, opacity: 0.6 }}>
                  The recipient will be able to fill in their details, draw or upload a signature, and sign the NDA. The timestamp is recorded automatically when they sign.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Signed Copy — only visible when both parties have signed */}
      {signatures.sinba && signatures.recipient && (
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Send className="h-5 w-5" />
              Send Signed Copy
            </CardTitle>
            <CardDescription>
              Generate a download link for the fully signed NDA PDF and share it with the specified email
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="email@example.com (who to send the signed copy to)"
                style={{ borderColor: LAVENDER }}
                className="flex-1"
              />
              <Button
                onClick={handleSendSigned}
                disabled={sending || !sendEmail}
                style={{ background: '#10B981', color: '#fff' }}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sending ? 'Generating…' : 'Generate & Send'}
              </Button>
            </div>
            {sentPdfUrl && (
              <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#10B981', background: '#F0FDF4' }}>
                <div className="text-xs font-semibold uppercase" style={{ color: '#10B981' }}>
                  ✓ Signed PDF ready for {sendEmail}
                </div>
                <div className="flex items-center gap-2">
                  <a href={sentPdfUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" style={{ borderColor: '#10B981', color: '#10B981' }}>
                      <Download className="h-4 w-4 mr-1.5" />
                      Download Signed PDF
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(sentPdfUrl)}
                    style={{ borderColor: ORCHID, color: ORCHID }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1.5">Copy Link</span>
                  </Button>
                </div>
                <p className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                  Download the signed PDF and forward it to {sendEmail}, or share the download link directly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
