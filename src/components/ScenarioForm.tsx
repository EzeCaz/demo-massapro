'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Plus, Trash2, Upload, FileText, X, Loader2, Link } from 'lucide-react'

interface ScenarioFormProps {
  scenario: any
  userRole?: string
}

export default function ScenarioForm({ scenario, userRole }: ScenarioFormProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const kbFileInputRef = useRef<HTMLInputElement>(null)

  // KPIs
  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis', scenario?.id],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenario.id}/kpis`)
      if (!res.ok) throw new Error('Failed to fetch KPIs')
      return res.json()
    },
    enabled: !!scenario?.id,
  })

  // Attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', scenario?.id],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenario.id}/attachments`)
      if (!res.ok) throw new Error('Failed to fetch attachments')
      return res.json()
    },
    enabled: !!scenario?.id,
  })

  // Initialize form data from scenario
  useEffect(() => {
    if (scenario) {
      const fields = [
        'name', 'companyWebsiteUrl', 'overview', 'companyGoals',
        'aiAutomationsRequired', 'demoFocusAreas', 'languagesVoice', 'languagesText',
        'scriptsFlows', 'knowledgeBaseText', 'faqObjectionHandling',
        'requiredIntegrations', 'erpCrmCcaas',
      ]
      const data: Record<string, any> = {}
      fields.forEach(f => {
        data[f] = (scenario as any)[f] || ''
      })
      setFormData(data)
    }
  }, [scenario])

  // Auto-save with debounce
  const saveDraft = useCallback(async (data: Record<string, any>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    } finally {
      setSaving(false)
    }
  }, [scenario?.id, queryClient])

  const handleFieldChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)

    // Debounced auto-save
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveDraft(newData)
    }, 1500)
  }

  const handleSaveDraft = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaving(true)
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: 'draft' }),
      })
      if (res.ok) {
        toast.success(t('dashboard.saved'))
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error(t('dashboard.error'))
      }
    } catch (error) {
      toast.error(t('dashboard.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaving(true)
    try {
      // Save first
      await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      // Then submit
      const res = await fetch(`/api/scenarios/${scenario.id}/submit`, {
        method: 'POST',
      })
      if (res.ok) {
        toast.success(t('dashboard.submittedMsg'), {
          description: '🎉',
          duration: 4000,
        })
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error(t('dashboard.error'))
      }
    } catch (error) {
      toast.error(t('dashboard.error'))
    } finally {
      setSaving(false)
    }
  }

  // KPI management
  const addKpi = async () => {
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New KPI', targetValue: '' }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['kpis', scenario.id] })
        toast.success('KPI added')
      }
    } catch (error) {
      toast.error('Failed to add KPI')
    }
  }

  const updateKpi = async (kpiId: string, name: string, targetValue: string) => {
    try {
      await fetch(`/api/scenarios/${scenario.id}/kpis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId, name, targetValue }),
      })
      queryClient.invalidateQueries({ queryKey: ['kpis', scenario.id] })
    } catch (error) {
      toast.error('Failed to update KPI')
    }
  }

  const deleteKpi = async (kpiId: string) => {
    try {
      await fetch(`/api/scenarios/${scenario.id}/kpis?kpiId=${kpiId}`, {
        method: 'DELETE',
      })
      queryClient.invalidateQueries({ queryKey: ['kpis', scenario.id] })
      toast.success('KPI removed')
    } catch (error) {
      toast.error('Failed to remove KPI')
    }
  }

  // File upload
  const handleFileUpload = async (files: FileList | null, category: string = 'attachment') => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', category)
        const res = await fetch(`/api/scenarios/${scenario.id}/attachments`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
      }
      queryClient.invalidateQueries({ queryKey: ['attachments', scenario.id] })
      toast.success('File(s) uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload file(s)')
    } finally {
      setUploading(false)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    try {
      await fetch(`/api/scenarios/${scenario.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
      })
      queryClient.invalidateQueries({ queryKey: ['attachments', scenario.id] })
      toast.success('File deleted')
    } catch (error) {
      toast.error('Failed to delete file')
    }
  }

  const formatUrl = (url: string): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `https://${url}`
  }

  if (!scenario) return null

  const isSubmitted = scenario.status === 'submitted'

  return (
    <div className="space-y-6">
      {/* Status Badge + Auto-save indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={isSubmitted ? 'default' : 'secondary'} className={isSubmitted ? 'bg-emerald text-white' : ''}>
            {isSubmitted ? t('dashboard.submitted') : t('dashboard.draft')}
          </Badge>
          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
      </div>

      {/* KPIs Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t('form.kpis')}</CardTitle>
            <Button variant="outline" size="sm" onClick={addKpi}>
              <Plus className="h-4 w-4 mr-1" /> {t('setup.addKpi')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('general.noData')}</p>
          ) : (
            <div className="space-y-2">
              {kpis.map((kpi: any) => (
                <div key={kpi.id} className="flex items-center gap-2">
                  <Input
                    value={kpi.name}
                    onChange={e => updateKpi(kpi.id, e.target.value, kpi.targetValue || '')}
                    className="flex-1"
                    placeholder={t('setup.kpiName')}
                  />
                  <Input
                    value={kpi.targetValue || ''}
                    onChange={e => updateKpi(kpi.id, kpi.name, e.target.value)}
                    className="w-40"
                    placeholder={t('setup.kpiTarget')}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKpi(kpi.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Form */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Company Website URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.websiteUrl')}</Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.companyWebsiteUrl || ''}
                onChange={e => handleFieldChange('companyWebsiteUrl', e.target.value)}
                placeholder="https://example.com"
                className="pl-10"
              />
            </div>
            {formData.companyWebsiteUrl && (
              <a
                href={formatUrl(formData.companyWebsiteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-vivid-blue hover:underline inline-flex items-center gap-1"
              >
                Visit site ↗
              </a>
            )}
          </div>

          <Separator />

          {/* Overview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.overview')}</Label>
            <Textarea
              value={formData.overview || ''}
              onChange={e => handleFieldChange('overview', e.target.value)}
              placeholder="Provide an overview of the company and demo requirements..."
              className="min-h-[100px]"
            />
          </div>

          {/* Company Goals */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.companyGoals')}</Label>
            <Textarea
              value={formData.companyGoals || ''}
              onChange={e => handleFieldChange('companyGoals', e.target.value)}
              placeholder="What are the company's primary goals for this demo?"
            />
          </div>

          {/* AI/Automations Required */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.aiAutomations')}</Label>
            <Textarea
              value={formData.aiAutomationsRequired || ''}
              onChange={e => handleFieldChange('aiAutomationsRequired', e.target.value)}
              placeholder="What AI and automation capabilities are required?"
            />
          </div>

          {/* Other Demo Focus Areas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.demoFocusAreas')}</Label>
            <Textarea
              value={formData.demoFocusAreas || ''}
              onChange={e => handleFieldChange('demoFocusAreas', e.target.value)}
              placeholder="Other areas the demo should focus on..."
            />
          </div>

          <Separator />

          {/* Languages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('form.languagesVoice')}</Label>
              <Input
                value={formData.languagesVoice || ''}
                onChange={e => handleFieldChange('languagesVoice', e.target.value)}
                placeholder="English, Spanish, Portuguese..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('form.languagesText')}</Label>
              <Input
                value={formData.languagesText || ''}
                onChange={e => handleFieldChange('languagesText', e.target.value)}
                placeholder="English, Spanish, Portuguese..."
              />
            </div>
          </div>

          <Separator />

          {/* Scripts / Flows */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.scriptsFlows')}</Label>
            <Textarea
              value={formData.scriptsFlows || ''}
              onChange={e => handleFieldChange('scriptsFlows', e.target.value)}
              placeholder="Describe the demo scripts and conversation flows..."
              className="min-h-[120px]"
            />
          </div>

          {/* Knowledge Base - Text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.knowledgeBase')}</Label>
            <Textarea
              value={formData.knowledgeBaseText || ''}
              onChange={e => handleFieldChange('knowledgeBaseText', e.target.value)}
              placeholder="Paste or describe the knowledge base content..."
              className="min-h-[120px]"
            />
            {/* KB File upload */}
            <div className="mt-2">
              <input
                ref={kbFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFileUpload(e.target.files, 'knowledge_base')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => kbFileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {t('form.upload')} KB Files
              </Button>
            </div>
          </div>

          {/* FAQ / Objection Handling */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.faqObjection')}</Label>
            <Textarea
              value={formData.faqObjectionHandling || ''}
              onChange={e => handleFieldChange('faqObjectionHandling', e.target.value)}
              placeholder="List common FAQs and objection handling strategies..."
            />
          </div>

          {/* Required Integrations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.requiredIntegrations')}</Label>
            <Textarea
              value={formData.requiredIntegrations || ''}
              onChange={e => handleFieldChange('requiredIntegrations', e.target.value)}
              placeholder="List required integrations (APIs, third-party services, etc.)..."
            />
          </div>

          {/* ERP / CRM / CCaaS */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('form.erpCrmCcaas')}</Label>
            <Textarea
              value={formData.erpCrmCcaas || ''}
              onChange={e => handleFieldChange('erpCrmCcaas', e.target.value)}
              placeholder="Specify ERP, CRM, and CCaaS platforms..."
            />
          </div>

          <Separator />

          {/* Attachments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('form.attachments')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleFileUpload(e.target.files, 'attachment')}
            />
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-vivid-blue/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('form.dragDrop')}</p>
            </div>

            {/* File list */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{att.fileName}</span>
                      <Badge variant="outline" className="text-xs">
                        {att.category === 'knowledge_base' ? 'KB' : 'File'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/scenarios/${scenario.id}/attachments/${att.id}`}
                        target="_blank"
                        className="text-xs text-vivid-blue hover:underline"
                      >
                        Download
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAttachment(att.id)}
                        className="text-destructive hover:text-destructive h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSaveDraft}
          disabled={saving}
          variant="outline"
          className="border-vivid-blue text-vivid-blue hover:bg-vivid-blue hover:text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {t('dashboard.saveDraft')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-emerald hover:bg-emerald/90 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {t('dashboard.submit')}
        </Button>
      </div>
    </div>
  )
}
