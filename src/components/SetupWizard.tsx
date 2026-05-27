'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SetupWizardProps {
  onComplete: () => void
}

interface KpiEntry {
  name: string
  targetValue: string
}

interface ScenarioEntry {
  name: string
  kpis: KpiEntry[]
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [scenarioCount, setScenarioCount] = useState(1)
  const [scenarios, setScenarios] = useState<ScenarioEntry[]>([
    { name: 'Scenario 1', kpis: [] },
  ])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    q1: true,
    q2: false,
    q3: false,
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(10, count))
    setScenarioCount(safeCount)
    setScenarios(prev => {
      const newScenarios = [...prev]
      while (newScenarios.length < safeCount) {
        newScenarios.push({ name: `Scenario ${newScenarios.length + 1}`, kpis: [] })
      }
      while (newScenarios.length > safeCount) {
        newScenarios.pop()
      }
      return newScenarios
    })
  }

  const updateScenarioName = (index: number, name: string) => {
    setScenarios(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], name }
      return updated
    })
  }

  const addKpi = (scenarioIndex: number) => {
    setScenarios(prev => {
      const updated = [...prev]
      updated[scenarioIndex] = {
        ...updated[scenarioIndex],
        kpis: [...updated[scenarioIndex].kpis, { name: '', targetValue: '' }],
      }
      return updated
    })
  }

  const updateKpi = (scenarioIndex: number, kpiIndex: number, field: keyof KpiEntry, value: string) => {
    setScenarios(prev => {
      const updated = [...prev]
      const kpis = [...updated[scenarioIndex].kpis]
      kpis[kpiIndex] = { ...kpis[kpiIndex], [field]: value }
      updated[scenarioIndex] = { ...updated[scenarioIndex], kpis }
      return updated
    })
  }

  const removeKpi = (scenarioIndex: number, kpiIndex: number) => {
    setScenarios(prev => {
      const updated = [...prev]
      const kpis = updated[scenarioIndex].kpis.filter((_, i) => i !== kpiIndex)
      updated[scenarioIndex] = { ...updated[scenarioIndex], kpis }
      return updated
    })
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          scenarios.map((s, i) => ({
            name: s.name,
            order: i,
            kpis: s.kpis.filter(k => k.name.trim() !== ''),
          }))
        ),
      })

      if (res.ok) {
        toast.success('Scenarios created successfully!')
        onComplete()
        // Also do a full page reload to dashboard to ensure fresh data
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create scenarios')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {t('setup.title')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('setup.subtitle')}</p>
        </div>

        <div className="space-y-4">
          {/* Question 1: How many scenarios? */}
          <Card>
            <Collapsible open={openSections.q1} onOpenChange={() => toggleSection('q1')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-vivid-blue text-white text-sm font-bold">1</span>
                      {t('setup.q1')}
                    </CardTitle>
                    {openSections.q1 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={scenarioCount}
                      onChange={e => handleCountChange(parseInt(e.target.value) || 1)}
                      className="w-24 text-center text-lg font-semibold"
                    />
                    <span className="text-muted-foreground">scenarios (1-10)</span>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Question 2: Name your scenarios */}
          <Card>
            <Collapsible open={openSections.q2} onOpenChange={() => toggleSection('q2')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-vivid-blue text-white text-sm font-bold">2</span>
                      {t('setup.q2')}
                    </CardTitle>
                    {openSections.q2 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {scenarios.map((scenario, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Label className="text-sm font-medium text-muted-foreground w-8">
                        {index + 1}.
                      </Label>
                      <Input
                        value={scenario.name}
                        onChange={e => updateScenarioName(index, e.target.value)}
                        placeholder={t('setup.scenarioName')}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Question 3: Set KPIs */}
          <Card>
            <Collapsible open={openSections.q3} onOpenChange={() => toggleSection('q3')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-vivid-blue text-white text-sm font-bold">3</span>
                      {t('setup.q3')}
                    </CardTitle>
                    {openSections.q3 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {scenarios.map((scenario, sIndex) => (
                    <div key={sIndex} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-3">{scenario.name}</h4>
                      {scenario.kpis.map((kpi, kIndex) => (
                        <div key={kIndex} className="flex items-center gap-2 mb-2">
                          <Input
                            value={kpi.name}
                            onChange={e => updateKpi(sIndex, kIndex, 'name', e.target.value)}
                            placeholder={t('setup.kpiName')}
                            className="flex-1"
                          />
                          <Input
                            value={kpi.targetValue}
                            onChange={e => updateKpi(sIndex, kIndex, 'targetValue', e.target.value)}
                            placeholder={t('setup.kpiTarget')}
                            className="w-32"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKpi(sIndex, kIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addKpi(sIndex)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('setup.addKpi')}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Create Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="bg-vivid-blue hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('general.loading')}
                </span>
              ) : (
                t('setup.create')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
