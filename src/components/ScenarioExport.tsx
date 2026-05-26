'use client'

import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { FileDown, FileSpreadsheet, Download } from 'lucide-react'

interface ScenarioExportProps {
  scenarioId: string
  scenarioName: string
}

export default function ScenarioExport({ scenarioId, scenarioName }: ScenarioExportProps) {
  const { t } = useLanguage()

  const exportCsv = () => {
    window.open(`/api/admin/export?scenarioId=${scenarioId}&format=csv`, '_blank')
    toast.success('CSV export started')
  }

  const exportAllCsv = () => {
    window.open('/api/admin/export?format=csv', '_blank')
    toast.success('CSV export started')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('admin.export')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
