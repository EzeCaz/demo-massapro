'use client'

import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { FileDown, FileSpreadsheet, Download, Loader2, Languages } from 'lucide-react'
import { useState, useMemo } from 'react'

interface ScenarioExportProps {
  scenarioId: string
  scenarioName: string
  // The full scenario object — used to detect which translations are available
  scenario?: any
}

// Fields that can have language-specific variants (En, Es, He suffixes)
const TRANSLATABLE_FIELDS = [
  'overview',
  'companyGoals',
  'aiAutomationsRequired',
  'demoFocusAreas',
  'scriptsFlows',
  'knowledgeBaseText',
  'faqObjectionHandling',
  'requiredIntegrations',
  'erpCrmCcaas',
]

// Human-readable language labels for the PDF language picker
const LANGUAGE_LABELS: Record<string, { label: string; nativeLabel: string; flag: string }> = {
  original: { label: 'Original', nativeLabel: 'Original', flag: '📄' },
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  es: { label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  he: { label: 'Hebrew', nativeLabel: 'עברית', flag: '🇮🇱' },
}

export default function ScenarioExport({ scenarioId, scenarioName, scenario }: ScenarioExportProps) {
  const { t } = useLanguage()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [langDialogOpen, setLangDialogOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState<string>('original')

  /**
   * Detect which languages are available for this scenario based on the
   * presence of content in the language-specific fields.
   *
   * - "original" is always available (uses the base field, e.g., `overview`)
   * - "en" is available if any `*En` field has content
   * - "es" is available if any `*Es` field has content
   * - "he" is available if any `*He` field has content
   */
  const availableLanguages = useMemo<string[]>(() => {
    if (!scenario) return ['original']

    const langs: string[] = ['original']
    for (const field of TRANSLATABLE_FIELDS) {
      if ((scenario[field + 'En'] || '').trim()) {
        if (!langs.includes('en')) langs.push('en')
      }
      if ((scenario[field + 'Es'] || '').trim()) {
        if (!langs.includes('es')) langs.push('es')
      }
      if ((scenario[field + 'He'] || '').trim()) {
        if (!langs.includes('he')) langs.push('he')
      }
    }
    return langs
  }, [scenario])

  const hasTranslations = availableLanguages.length > 1

  const exportCsv = () => {
    window.open(`/api/admin/export?scenarioId=${scenarioId}&format=csv`, '_blank')
    toast.success('CSV export started')
  }

  const exportAllCsv = () => {
    window.open('/api/admin/export?format=csv', '_blank')
    toast.success('CSV export started')
  }

  const doExportPdf = async (lang: string) => {
    setPdfLoading(true)
    try {
      const url = new URL(`/api/scenarios/${scenarioId}/pdf`, window.location.origin)
      if (lang && lang !== 'original') {
        url.searchParams.set('lang', lang)
      }
      const res = await fetch(url.toString())
      if (!res.ok) {
        toast.error('Failed to generate PDF')
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const langSuffix = lang && lang !== 'original' ? `-${lang}` : ''
      a.download = `MassaPro-Demo-Form-${scenarioName.replace(/[^a-zA-Z0-9]/g, '-')}${langSuffix}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      toast.success('PDF downloaded!')
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handlePdfClick = () => {
    if (hasTranslations) {
      // Open the language picker dialog
      setSelectedLang('original')
      setLangDialogOpen(true)
    } else {
      // No translations — just download the original-language PDF directly
      doExportPdf('original')
    }
  }

  const handleConfirmLanguage = () => {
    setLangDialogOpen(false)
    doExportPdf(selectedLang)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('admin.export')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          onClick={handlePdfClick}
          disabled={pdfLoading}
          className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {t('export.pdf')} - {scenarioName}
          {hasTranslations && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              <Languages className="h-3 w-3" />
              {availableLanguages.length - 1}+ translations
            </span>
          )}
        </Button>
        <Button variant="outline" onClick={exportCsv} className="w-full justify-start">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t('export.csv')} - {scenarioName}
        </Button>
        <Button variant="outline" onClick={exportAllCsv} className="w-full justify-start">
          <FileDown className="h-4 w-4 mr-2" />
          {t('export.csv')} - All Scenarios
        </Button>
      </CardContent>

      {/* Language picker dialog — shown when translations are available */}
      <Dialog open={langDialogOpen} onOpenChange={setLangDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-purple-600" />
              {t('export.chooseLanguage')}
            </DialogTitle>
            <DialogDescription>
              {t('export.chooseLanguageDesc')}
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={selectedLang}
            onValueChange={setSelectedLang}
            className="gap-2"
          >
            {availableLanguages.map(lang => {
              const meta = LANGUAGE_LABELS[lang] || { label: lang, nativeLabel: lang, flag: '🌐' }
              const isRTL = lang === 'he'
              return (
                <Label
                  key={lang}
                  htmlFor={`lang-${lang}`}
                  className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedLang === lang ? 'border-purple-400 bg-purple-50' : 'border-input'
                  }`}
                >
                  <RadioGroupItem id={`lang-${lang}`} value={lang} />
                  <span className="text-lg">{meta.flag}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div
                      className="text-xs text-muted-foreground"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      {meta.nativeLabel}
                    </div>
                  </div>
                </Label>
              )
            })}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLangDialogOpen(false)}>
              {t('general.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirmLanguage}
              disabled={pdfLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('export.download')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
