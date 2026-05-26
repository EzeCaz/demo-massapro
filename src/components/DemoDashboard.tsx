'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check, Loader2, Download } from 'lucide-react'
import ScenarioForm from './ScenarioForm'
import CollaboratorPanel from './CollaboratorPanel'
import CommentsPanel from './CommentsPanel'
import ChangeLogPanel from './ChangeLogPanel'
import AdminNotesPanel from './AdminNotesPanel'
import TranslationPanel from './TranslationPanel'
import ScenarioExport from './ScenarioExport'

export default function DemoDashboard() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  const [activeTab, setActiveTab] = useState<string>('form')
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState('')

  // Fetch scenarios
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed to fetch scenarios')
      return res.json()
    },
  })

  // Set initial active scenario
  const currentScenario = scenarios.find((s: any) => s.id === activeScenarioId) || scenarios[0]

  const handleAddScenario = async () => {
    if (!newScenarioName.trim()) {
      toast.error('Please enter a scenario name')
      return
    }
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newScenarioName,
          order: scenarios.length,
        }),
      })
      if (res.ok) {
        toast.success('Scenario added!')
        setAddDialogOpen(false)
        setNewScenarioName('')
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      }
    } catch (error) {
      toast.error('Failed to add scenario')
    }
  }

  const handleDeleteScenario = async (id: string) => {
    if (!confirm(t('general.confirm'))) return
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Scenario deleted')
        if (activeScenarioId === id) setActiveScenarioId(null)
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      }
    } catch (error) {
      toast.error('Failed to delete scenario')
    }
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null)
      return
    }
    try {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue }),
      })
      if (res.ok) {
        toast.success('Scenario renamed')
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      }
    } catch (error) {
      toast.error('Failed to rename scenario')
    } finally {
      setRenamingId(null)
    }
  }

  const startRename = (scenario: any) => {
    setRenamingId(scenario.id)
    setRenameValue(scenario.name)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-vivid-blue" />
      </div>
    )
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('general.noData')}</p>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-vivid-blue hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              {t('dashboard.addScenario')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dashboard.addScenario')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                value={newScenarioName}
                onChange={e => setNewScenarioName(e.target.value)}
                placeholder={t('setup.scenarioName')}
                onKeyDown={e => e.key === 'Enter' && handleAddScenario()}
              />
              <Button onClick={handleAddScenario} className="w-full bg-vivid-blue hover:bg-blue-700">
                {t('general.add')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Scenario Tabs */}
      <div className="border-b">
        <div className="flex items-center gap-1 overflow-x-auto pb-0 custom-scrollbar">
          {scenarios.map((scenario: any) => (
            <div
              key={scenario.id}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 cursor-pointer whitespace-nowrap transition-colors ${
                currentScenario?.id === scenario.id
                  ? 'border-vivid-blue text-vivid-blue'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              onClick={() => setActiveScenarioId(scenario.id)}
            >
              {renamingId === scenario.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(scenario.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="h-7 w-36 text-sm"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={e => {
                      e.stopPropagation()
                      handleRename(scenario.id)
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={e => {
                      e.stopPropagation()
                      setRenamingId(null)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span>{scenario.name}</span>
                  <Badge
                    variant={scenario.status === 'submitted' ? 'default' : 'secondary'}
                    className={`text-[10px] px-1.5 py-0 ${scenario.status === 'submitted' ? 'bg-emerald text-white' : ''}`}
                  >
                    {scenario.status === 'submitted' ? t('dashboard.submitted') : t('dashboard.draft')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={e => {
                      e.stopPropagation()
                      startRename(scenario)
                    }}
                    title="Rename"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={e => {
                      e.stopPropagation()
                      handleDeleteScenario(scenario.id)
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Add Scenario Button */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-1">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('dashboard.addScenario')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  value={newScenarioName}
                  onChange={e => setNewScenarioName(e.target.value)}
                  placeholder={t('setup.scenarioName')}
                  onKeyDown={e => e.key === 'Enter' && handleAddScenario()}
                />
                <Button onClick={handleAddScenario} className="w-full bg-vivid-blue hover:bg-blue-700">
                  {t('general.add')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sub-Tabs for each scenario */}
      {currentScenario && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7">
            <TabsTrigger value="form" className="text-xs sm:text-sm">Form</TabsTrigger>
            <TabsTrigger value="collaborators" className="text-xs sm:text-sm">{t('tab.collaborators')}</TabsTrigger>
            <TabsTrigger value="comments" className="text-xs sm:text-sm">{t('tab.comments')}</TabsTrigger>
            <TabsTrigger value="changelog" className="text-xs sm:text-sm">{t('tab.changeHistory')}</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs sm:text-sm">{t('tab.adminNotes')}</TabsTrigger>
            <TabsTrigger value="translate" className="text-xs sm:text-sm">{t('translate.title')}</TabsTrigger>
            <TabsTrigger value="export" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 mr-1" />
              {t('admin.export')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-4">
            <ScenarioForm scenario={currentScenario} userRole={userRole} />
          </TabsContent>

          <TabsContent value="collaborators" className="mt-4">
            <CollaboratorPanel scenarioId={currentScenario.id} />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <CommentsPanel scenarioId={currentScenario.id} />
          </TabsContent>

          <TabsContent value="changelog" className="mt-4">
            <ChangeLogPanel scenarioId={currentScenario.id} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <AdminNotesPanel scenarioId={currentScenario.id} />
          </TabsContent>

          <TabsContent value="translate" className="mt-4">
            <TranslationPanel scenarioId={currentScenario.id} scenario={currentScenario} />
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            <ScenarioExport scenarioId={currentScenario.id} scenarioName={currentScenario.name} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
