'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Languages, Loader2, Save, Check } from 'lucide-react'

interface TranslationPanelProps {
  scenarioId: string
  scenario: any
}

export default function TranslationPanel({ scenarioId, scenario }: TranslationPanelProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState<'es-to-en' | 'en-to-es' | 'he-to-en' | 'en-to-he' | 'es-to-he' | 'he-to-es'>('es-to-en')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [translating, setTranslating] = useState(false)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const translatableFields = [
    { key: 'overview', label: t('form.overview') },
    { key: 'companyGoals', label: t('form.companyGoals') },
    { key: 'aiAutomationsRequired', label: t('form.aiAutomations') },
    { key: 'demoFocusAreas', label: t('form.demoFocusAreas') },
    { key: 'scriptsFlows', label: t('form.scriptsFlows') },
    { key: 'knowledgeBaseText', label: t('form.knowledgeBase') },
    { key: 'faqObjectionHandling', label: t('form.faqObjection') },
    { key: 'requiredIntegrations', label: t('form.requiredIntegrations') },
    { key: 'erpCrmCcaas', label: t('form.erpCrmCcaas') },
  ]

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    )
  }

  const handleTranslate = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to translate')
      return
    }
    setTranslating(true)
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: selectedFields, direction }),
      })
      const data = await res.json()
      if (res.ok) {
        setTranslations(data.translations)
        setEditedTranslations(data.translations)
        toast.success('Translation completed!')
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error(data.error || 'Translation failed')
      }
    } catch (error) {
      toast.error('Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  const handleSaveTranslations = async () => {
    setSaving(true)
    try {
      const updateData: any = {}
      for (const [field, value] of Object.entries(editedTranslations)) {
        if (direction === 'es-to-en') {
          const enField = field + 'En'
          updateData[enField] = value
        } else if (direction === 'en-to-es') {
          const esField = field + 'Es'
          updateData[esField] = value
        } else if (direction === 'he-to-en') {
          const enField = field + 'En'
          updateData[enField] = value
        } else if (direction === 'en-to-he') {
          const heField = field + 'He'
          updateData[heField] = value
        } else if (direction === 'es-to-he') {
          const heField = field + 'He'
          updateData[heField] = value
        } else if (direction === 'he-to-es') {
          const esField = field + 'Es'
          updateData[esField] = value
        }
      }

      const res = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (res.ok) {
        toast.success('Translations saved!')
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error('Failed to save translations')
      }
    } catch (error) {
      toast.error('Failed to save translations')
    } finally {
      setSaving(false)
    }
  }

  // Show existing translations
  const getExistingTranslation = (fieldKey: string) => {
    if (direction === 'es-to-en' || direction === 'he-to-en') {
      return (scenario as any)[fieldKey + 'En'] || ''
    } else if (direction === 'en-to-es' || direction === 'he-to-es') {
      return (scenario as any)[fieldKey + 'Es'] || ''
    } else if (direction === 'en-to-he' || direction === 'es-to-he') {
      return (scenario as any)[fieldKey + 'He'] || ''
    }
    return ''
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Languages className="h-5 w-5" />
          {t('translate.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direction Selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">{t('translate.direction')}:</Label>
          <Select value={direction} onValueChange={v => setDirection(v as any)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es-to-en">{t('translate.toEnglish')}</SelectItem>
              <SelectItem value="en-to-es">{t('translate.toSpanish')}</SelectItem>
              <SelectItem value="he-to-en">Hebrew → English</SelectItem>
              <SelectItem value="en-to-he">English → Hebrew</SelectItem>
              <SelectItem value="es-to-he">Spanish → Hebrew</SelectItem>
              <SelectItem value="he-to-es">Hebrew → Spanish</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Existing Translations */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Existing Translations</h4>
          {translatableFields.map(field => {
            const original = (scenario as any)[field.key] || ''
            const existing = getExistingTranslation(field.key)
            if (!original && !existing) return null
            return (
              <div key={field.key} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Original - {field.label}
                  </Label>
                  <div className="p-2 bg-muted rounded-md text-sm mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {original || <span className="italic text-muted-foreground">Empty</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Translated - {field.label}
                  </Label>
                  <div className="p-2 bg-emerald/5 border border-emerald/20 rounded-md text-sm mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {existing || <span className="italic text-muted-foreground">Not translated yet</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t pt-4">
          {/* Field Selection for new translation */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Select fields to translate:</p>
            <div className="flex flex-wrap gap-2">
              {translatableFields.map(field => (
                <Badge
                  key={field.key}
                  variant={selectedFields.includes(field.key) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleField(field.key)}
                >
                  {selectedFields.includes(field.key) && <Check className="h-3 w-3 mr-1" />}
                  {field.label}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFields(translatableFields.map(f => f.key))}
            >
              Select All
            </Button>
          </div>

          {/* Translate Button */}
          <Button
            onClick={handleTranslate}
            disabled={translating || selectedFields.length === 0}
            className="bg-vivid-blue hover:bg-blue-700 mt-3"
          >
            {translating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Languages className="h-4 w-4 mr-2" />
            )}
            Translate
          </Button>

          {/* Results */}
          {Object.keys(translations).length > 0 && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t('translate.translated')}</h4>
                <Button
                  onClick={handleSaveTranslations}
                  disabled={saving}
                  size="sm"
                  className="bg-emerald hover:bg-emerald/90"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {t('translate.save')}
                </Button>
              </div>
              {Object.entries(translations).map(([field, translated]) => {
                const fieldLabel = translatableFields.find(f => f.key === field)?.label || field
                const original = (scenario as any)[field] || ''
                return (
                  <div key={field} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('translate.original')} - {fieldLabel}
                      </Label>
                      <div className="p-2 bg-muted rounded-md text-sm mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {original}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('translate.translated')} - {fieldLabel}
                      </Label>
                      <Textarea
                        value={editedTranslations[field] || ''}
                        onChange={e =>
                          setEditedTranslations(prev => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        className="mt-1 min-h-[80px]"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
