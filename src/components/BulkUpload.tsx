'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Upload, FileText, Users, UserPlus, Download, AlertCircle,
  CheckCircle2, XCircle, Loader2, FileSpreadsheet, Copy,
} from 'lucide-react'
import {
  generateScenarioCSVTemplate,
  generateClientCSVTemplate,
  generateUserCSVTemplate,
} from '@/lib/csv-parser'

type UploadType = 'scenarios' | 'clients' | 'users'

interface UploadResult {
  type: UploadType
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  credentials?: { email: string; password: string; name: string; role?: string }[]
  details?: { email?: string; name?: string; action: string; id?: string; role?: string }[]
}

export default function BulkUpload() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState<UploadType>('scenarios')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: UploadType }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || errorData.details || 'Upload failed')
      }

      return res.json()
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data)
      toast.success(
        `Import complete: ${data.created} created, ${data.updated || 0} updated, ${data.skipped} skipped`
      )
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
      queryClient.invalidateQueries({ queryKey: ['admin-scenarios'] })
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`)
    },
  })

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setSelectedFile(file)
    setUploadResult(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }
    uploadMutation.mutate({ file: selectedFile, type: activeType })
  }

  const handleDownloadTemplate = (type: UploadType) => {
    let csvContent = ''
    let fileName = ''

    switch (type) {
      case 'scenarios':
        csvContent = generateScenarioCSVTemplate()
        fileName = 'scenarios_template.csv'
        break
      case 'clients':
        csvContent = generateClientCSVTemplate()
        fileName = 'clients_template.csv'
        break
      case 'users':
        csvContent = generateUserCSVTemplate()
        fileName = 'users_template.csv'
        break
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyCredentials = () => {
    if (!uploadResult?.credentials || uploadResult.credentials.length === 0) return
    const text = uploadResult.credentials
      .map(c => `Email: ${c.email}\nPassword: ${c.password}\nName: ${c.name}${c.role ? `\nRole: ${c.role}` : ''}`)
      .join('\n\n---\n\n')
    navigator.clipboard.writeText(text)
    toast.success('Credentials copied to clipboard!')
  }

  const getTypeInfo = (type: UploadType) => {
    switch (type) {
      case 'scenarios':
        return {
          icon: <FileText className="h-5 w-5" />,
          title: t('upload.scenarios'),
          description: t('upload.scenariosDesc'),
          fields: [
            'name* (required)', 'overview', 'overview_es', 'overview_en',
            'company_website_url', 'status (draft|submitted)',
            'client_id OR client_email', 'company_goals', 'company_goals_es', 'company_goals_en',
            'ai_automations_required', 'ai_automations_required_es', 'ai_automations_required_en',
            'demo_focus_areas', 'demo_focus_areas_es', 'demo_focus_areas_en',
            'languages_voice', 'languages_text',
            'scripts_flows', 'scripts_flows_es', 'scripts_flows_en',
            'knowledge_base_text', 'knowledge_base_text_es', 'knowledge_base_text_en',
            'faq_objection_handling', 'faq_objection_handling_es', 'faq_objection_handling_en',
            'required_integrations', 'required_integrations_es', 'required_integrations_en',
            'erp_crm_ccaas', 'erp_crm_ccaas_es', 'erp_crm_ccaas_en',
          ],
        }
      case 'clients':
        return {
          icon: <Users className="h-5 w-5" />,
          title: t('upload.clients'),
          description: t('upload.clientsDesc'),
          fields: [
            'name*', 'email* (required)', 'company',
            'password (auto-generated if empty)',
            'status (ignored)', 'scenario_count (ignored)', 'wizard_completed (ignored)',
          ],
        }
      case 'users':
        return {
          icon: <UserPlus className="h-5 w-5" />,
          title: t('upload.users'),
          description: t('upload.usersDesc'),
          fields: [
            'full_name*', 'email* (required)', 'role (user|admin)',
            'company', 'password (auto-generated if empty)',
          ],
        }
    }
  }

  const typeInfo = getTypeInfo(activeType)

  return (
    <div className="space-y-6">
      <Tabs value={activeType} onValueChange={(v) => { setActiveType(v as UploadType); setSelectedFile(null); setUploadResult(null) }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scenarios" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 sm:mr-2" />
            {t('upload.scenarios')}
          </TabsTrigger>
          <TabsTrigger value="clients" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            {t('upload.clients')}
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">
            <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
            {t('upload.users')}
          </TabsTrigger>
        </TabsList>

        {(['scenarios', 'clients', 'users'] as UploadType[]).map((type) => {
          const info = getTypeInfo(type)
          return (
            <TabsContent key={type} value={type} className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Area */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {info.icon}
                        {info.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {info.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Drag & Drop Zone */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                          dragOver
                            ? 'border-vivid-blue bg-blue-50'
                            : selectedFile
                            ? 'border-emerald bg-emerald-50'
                            : 'border-muted-foreground/25 hover:border-vivid-blue/50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        {selectedFile ? (
                          <div className="space-y-2">
                            <FileSpreadsheet className="h-10 w-10 mx-auto text-emerald" />
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {t('upload.dragDrop')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              CSV files only
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleUpload}
                          disabled={!selectedFile || uploadMutation.isPending}
                          className="w-full bg-vivid-blue hover:bg-blue-700"
                        >
                          {uploadMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t('upload.uploading')}
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              {t('upload.importButton')}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadTemplate(type)}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t('upload.downloadTemplate')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reference & Results */}
                <div className="space-y-4">
                  {/* Field Reference */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t('upload.fieldReference')}</CardTitle>
                      <CardDescription className="text-xs">
                        {t('upload.fieldReferenceDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                        {info.fields.map((field, idx) => (
                          <Badge
                            key={idx}
                            variant={field.includes('*') ? 'default' : 'secondary'}
                            className={`text-[10px] ${field.includes('*') ? 'bg-vivid-blue' : ''}`}
                          >
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Upload Results */}
                  {uploadResult && uploadResult.type === type && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t('upload.results')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-emerald-50 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 mx-auto text-emerald mb-1" />
                            <p className="text-lg font-bold text-emerald">{uploadResult.created}</p>
                            <p className="text-xs text-muted-foreground">{t('upload.created')}</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <Badge variant="outline" className="text-blue-600 border-blue-300 mb-1">
                              Updated
                            </Badge>
                            <p className="text-lg font-bold text-blue-600">{uploadResult.updated || 0}</p>
                            <p className="text-xs text-muted-foreground">{t('upload.updated')}</p>
                          </div>
                          <div className="text-center p-3 bg-amber-50 rounded-lg">
                            <AlertCircle className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                            <p className="text-lg font-bold text-amber-600">{uploadResult.skipped}</p>
                            <p className="text-xs text-muted-foreground">{t('upload.skipped')}</p>
                          </div>
                        </div>

                        {/* Errors */}
                        {uploadResult.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-destructive flex items-center gap-1">
                              <XCircle className="h-4 w-4" />
                              {t('upload.errors')} ({uploadResult.errors.length})
                            </p>
                            <div className="max-h-32 overflow-y-auto text-xs space-y-1 bg-destructive/5 p-2 rounded">
                              {uploadResult.errors.map((err, idx) => (
                                <p key={idx} className="text-destructive">{err}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Credentials for new users */}
                        {uploadResult.credentials && uploadResult.credentials.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{t('upload.newCredentials')}</p>
                              <Button variant="outline" size="sm" onClick={copyCredentials}>
                                <Copy className="h-3 w-3 mr-1" />
                                {t('upload.copyAll')}
                              </Button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {uploadResult.credentials.map((cred, idx) => (
                                <div key={idx} className="p-2 bg-muted rounded text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{cred.name}</span>
                                    {cred.role && (
                                      <Badge variant="secondary" className="text-[9px] px-1">
                                        {cred.role}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground mt-0.5">
                                    Email: <span className="font-mono">{cred.email}</span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    Password: <span className="font-mono">{cred.password}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detail list */}
                        {uploadResult.details && uploadResult.details.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{t('upload.details')}</p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {uploadResult.details.map((detail, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  {detail.action === 'created' && <CheckCircle2 className="h-3 w-3 text-emerald flex-shrink-0" />}
                                  {detail.action === 'updated' && <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-600 border-blue-300">Updated</Badge>}
                                  {detail.action === 'skipped_existing' && <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                                  <span className="truncate">{detail.name || detail.email || 'Unknown'}</span>
                                  <span className="text-muted-foreground">— {detail.action.replace('_', ' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
