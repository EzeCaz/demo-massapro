'use client'

import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { FileDown, FileSpreadsheet, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ScenarioExportProps {
  scenarioId: string
  scenarioName: string
}

export default function ScenarioExport({ scenarioId, scenarioName }: ScenarioExportProps) {
  const { t } = useLanguage()
  const [pdfLoading, setPdfLoading] = useState(false)

  const exportCsv = () => {
    window.open(`/api/admin/export?scenarioId=${scenarioId}&format=csv`, '_blank')
    toast.success('CSV export started')
  }

  const exportAllCsv = () => {
    window.open('/api/admin/export?format=csv', '_blank')
    toast.success('CSV export started')
  }

  const exportPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/pdf`)
      if (!res.ok) {
        toast.error('Failed to generate PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MassaPro-Demo-Form-${scenarioName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('admin.export')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          onClick={exportPdf}
          disabled={pdfLoading}
          className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {t('export.pdf')} - {scenarioName}
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
    </Card>
  )
}
