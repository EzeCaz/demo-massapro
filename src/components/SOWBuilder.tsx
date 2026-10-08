'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import {
  SERVICES,
  CATEGORY_LABELS,
  brandClean,
  STATUS_LABELS,
  DEFAULT_MILESTONES,
  type ServiceCategory,
  type ServiceTask,
  type TaskStatus,
  type Service,
  type MilestoneRow,
} from '@/lib/sow-data'
import { exportSowWord, type SOWCoverInfo, type SOWTaskState, type SOWSpecValue, type CustomService } from '@/lib/sow-export'
import {
  Phone, Smartphone, Mail, MessageSquare, MessageCircle, Share2, Instagram, Twitter,
  LayoutDashboard, Award, ClipboardCheck, Bot, Volume2, Mic, Plug, GraduationCap,
  Plus, Trash2, Download, RotateCcw, Save, FileText, CheckCircle2, Clock, Circle, XCircle,
  Filter, Settings, ChevronDown, ChevronRight, Pencil, X, Sparkles, Layout,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Brand constants — MassaPro Brand Book
// ---------------------------------------------------------------------------
const ORCHID = '#9333EA'   // Orchid Purple — primary accent
const WHITE = '#FFFFFF'    // Pure White — backgrounds
const JET = '#030712'      // Jet Black — body text
const LAVENDER = '#F3E8FF' // Soft Lavender — subtle backgrounds

// MassaPro logo URL — provided in the SOW brief.
const MASSAPRO_LOGO_URL =
  'https://framerusercontent.com/images/17hVPyuYjfiumzqVcSC1TEnT7A.png?width=835&height=835'

// ---------------------------------------------------------------------------
// Icon mapping — service.icon (string) → lucide-react component
// ---------------------------------------------------------------------------
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone, Smartphone, Mail, MessageSquare, MessageCircle, Share2, Instagram, Twitter,
  LayoutDashboard, Award, ClipboardCheck, Bot, Volume2, Mic, Plug, GraduationCap,
  Sparkles, // fallback for custom services
}

// ---------------------------------------------------------------------------
// State shape persisted to localStorage
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'massapro-sow-state-v1'

interface SOWState {
  cover: SOWCoverInfo
  selectedServiceIds: string[]
  customServices: CustomService[]
  taskState: SOWTaskState
  specValues: SOWSpecValue
}

const DEFAULT_STATE: SOWState = {
  cover: {
    clientName: '',
    projectName: '',
    date: new Date().toISOString().split('T')[0],
    version: 'v1.0',
    preparedBy: '',
    overview: '',
  },
  selectedServiceIds: SERVICES.filter((s) => s.enabledByDefault).map((s) => s.id),
  customServices: [],
  taskState: {},
  specValues: {},
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SOWBuilder() {
  const { t, language } = useLanguage()
  const isRTL = language === 'he'

  const [state, setState] = useState<SOWState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [activeServiceFilter, setActiveServiceFilter] = useState<string>('all')
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all')
  const [showAddCustomService, setShowAddCustomService] = useState(false)
  const [customServiceDraft, setCustomServiceDraft] = useState({ name: '', description: '' })
  const [showAddCustomTask, setShowAddCustomTask] = useState(false)
  const [customTaskDraft, setCustomTaskDraft] = useState({ title: '', description: '', serviceId: '' })
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})

  // ---- Hydration from localStorage (client only) -------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SOWState
        // Merge with defaults to handle schema additions gracefully
        setState({
          cover: { ...DEFAULT_STATE.cover, ...parsed.cover },
          selectedServiceIds: parsed.selectedServiceIds ?? DEFAULT_STATE.selectedServiceIds,
          customServices: parsed.customServices ?? [],
          taskState: parsed.taskState ?? {},
          specValues: parsed.specValues ?? {},
        })
      }
    } catch {
      // ignore — start with defaults
    }
    setHydrated(true)
  }, [])

  // ---- Auto-save to localStorage (debounced via micro-batching) -----------
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated])

  // ---- Derived: all services (builtin + custom) --------------------------
  const allServices: (Service | CustomService)[] = useMemo(() => {
    const builtin = SERVICES.filter((s) => state.selectedServiceIds.includes(s.id))
    return [...builtin, ...state.customServices]
  }, [state.selectedServiceIds, state.customServices])

  // ---- Derived: all tasks from selected services -------------------------
  const allTasks = useMemo(() => {
    const list: { task: ServiceTask; serviceName: string; serviceId: string }[] = []
    allServices.forEach((svc) => {
      svc.tasks.forEach((task) => {
        list.push({ task, serviceName: svc.name, serviceId: svc.id })
      })
    })
    return list
  }, [allServices])

  // ---- Filter tasks by service + status ----------------------------------
  const filteredTasks = useMemo(() => {
    return allTasks.filter(({ task, serviceId }) => {
      if (activeServiceFilter !== 'all' && serviceId !== activeServiceFilter) return false
      if (activeStatusFilter !== 'all') {
        const st = state.taskState[task.id]?.status ?? 'pending'
        if (st !== activeStatusFilter) return false
      }
      return true
    })
  }, [allTasks, activeServiceFilter, activeStatusFilter, state.taskState])

  // ---- Total estimated hours -------------------------------------------
  const totalHours = useMemo(() => {
    return allTasks.reduce((acc, { task }) => acc + (task.estimatedHours || 0), 0)
  }, [allTasks])

  // ---- Counts for status filter chips ----------------------------------
  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { pending: 0, 'in-progress': 0, completed: 0, blocked: 0 }
    allTasks.forEach(({ task }) => {
      const st = state.taskState[task.id]?.status ?? 'pending'
      counts[st] += 1
    })
    return counts
  }, [allTasks, state.taskState])

  // ---- Toggle service selection ---------------------------------------
  const toggleService = useCallback((id: string) => {
    setState((prev) => {
      const isSelected = prev.selectedServiceIds.includes(id)
      return {
        ...prev,
        selectedServiceIds: isSelected
          ? prev.selectedServiceIds.filter((sid) => sid !== id)
          : [...prev.selectedServiceIds, id],
      }
    })
  }, [])

  // ---- Add custom service ---------------------------------------------
  const addCustomService = useCallback(() => {
    const name = customServiceDraft.name.trim()
    const description = customServiceDraft.description.trim()
    if (!name) {
      toast.error('Service name is required')
      return
    }
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newService: CustomService = {
      id,
      name,
      description: description || 'Custom service added by user.',
      tasks: [
        {
          id: `${id}-task-1`,
          title: `Discovery & planning — ${name}`,
          description: 'Define scope, dependencies, acceptance criteria and timeline for this custom service.',
          estimatedHours: 8,
          category: 'channel',
        },
        {
          id: `${id}-task-2`,
          title: `Configure & test — ${name}`,
          description: 'Implement configuration, integrate with MassaPro core, run UAT.',
          estimatedHours: 12,
          category: 'channel',
        },
      ],
      techSpecs: [
        { id: `${id}-spec-1`, field: 'Scope', description: 'What this service covers.', example: '' },
        { id: `${id}-spec-2`, field: 'Integration points', description: 'Where it plugs into MassaPro.', example: '' },
      ],
    }
    setState((prev) => ({
      ...prev,
      customServices: [...prev.customServices, newService],
      selectedServiceIds: [...prev.selectedServiceIds, id],
    }))
    setCustomServiceDraft({ name: '', description: '' })
    setShowAddCustomService(false)
    toast.success(`Added custom service: ${name}`)
  }, [customServiceDraft])

  // ---- Remove custom service -------------------------------------------
  const removeCustomService = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      customServices: prev.customServices.filter((s) => s.id !== id),
      selectedServiceIds: prev.selectedServiceIds.filter((sid) => sid !== id),
    }))
    if (activeServiceFilter === id) setActiveServiceFilter('all')
  }, [activeServiceFilter])

  // ---- Custom tasks registry (for tasks added to builtin services) ----
  // Declared early so addCustomTask (below) can safely reference
  // setCustomTasksRegistry without temporal-dead-zone issues.
  const [customTasksRegistry, setCustomTasksRegistry] = useState<Record<string, ServiceTask[]>>({})

  // ---- Milestones — editable version of DEFAULT_MILESTONES ----------
  const [milestones, setMilestones] = useState<MilestoneRow[]>(DEFAULT_MILESTONES)

  // Load custom tasks registry + milestones from localStorage
  useEffect(() => {
    if (!hydrated) return
    try {
      const rawTasks = localStorage.getItem(STORAGE_KEY + '-custom-tasks')
      if (rawTasks) setCustomTasksRegistry(JSON.parse(rawTasks))
      const rawMilestones = localStorage.getItem(STORAGE_KEY + '-milestones')
      if (rawMilestones) setMilestones(JSON.parse(rawMilestones))
    } catch {}
  }, [hydrated])
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY + '-custom-tasks', JSON.stringify(customTasksRegistry))
  }, [customTasksRegistry, hydrated])
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY + '-milestones', JSON.stringify(milestones))
  }, [milestones, hydrated])

  const updateMilestone = useCallback((id: string, field: keyof MilestoneRow, value: string) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }, [])

  // ---- Add custom task -------------------------------------------------
  const addCustomTask = useCallback(() => {
    const title = customTaskDraft.title.trim()
    const description = customTaskDraft.description.trim()
    const serviceId = customTaskDraft.serviceId || (allServices[0]?.id ?? '')
    if (!title) {
      toast.error('Task title is required')
      return
    }
    if (!serviceId) {
      toast.error('Please select at least one service first')
      return
    }
    const newTask: ServiceTask = {
      id: `custom-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: description || 'Custom task added by user.',
      estimatedHours: 4,
      category: 'channel',
    }
    // If the service is a custom service, append to its tasks list.
    // Otherwise, register the task under customTasksRegistry[serviceId]
    // so it shows up alongside the builtin service's tasks.
    const isCustomService = state.customServices.some((s) => s.id === serviceId)
    if (isCustomService) {
      setState((prev) => ({
        ...prev,
        customServices: prev.customServices.map((s) =>
          s.id === serviceId ? { ...s, tasks: [...s.tasks, newTask] } : s
        ),
      }))
    } else {
      setCustomTasksRegistry((prev) => ({
        ...prev,
        [serviceId]: [...(prev[serviceId] || []), newTask],
      }))
    }
    setCustomTaskDraft({ title: '', description: '', serviceId: '' })
    setShowAddCustomTask(false)
    toast.success(`Added task: ${title}`)
  }, [customTaskDraft, allServices, state.customServices])

  // Merge custom tasks (added to builtin services) into the task list
  const allTasksWithCustom = useMemo(() => {
    const extra: { task: ServiceTask; serviceName: string; serviceId: string }[] = []
    SERVICES.forEach((svc) => {
      if (state.selectedServiceIds.includes(svc.id) && customTasksRegistry[svc.id]) {
        customTasksRegistry[svc.id].forEach((task) => {
          extra.push({ task, serviceName: svc.name, serviceId: svc.id })
        })
      }
    })
    return [...allTasks, ...extra]
  }, [allTasks, customTasksRegistry, state.selectedServiceIds])

  // Re-filter using the merged list
  const filteredTasksFinal = useMemo(() => {
    return allTasksWithCustom.filter(({ task, serviceId }) => {
      if (activeServiceFilter !== 'all' && serviceId !== activeServiceFilter) return false
      if (activeStatusFilter !== 'all') {
        const st = state.taskState[task.id]?.status ?? 'pending'
        if (st !== activeStatusFilter) return false
      }
      return true
    })
  }, [allTasksWithCustom, activeServiceFilter, activeStatusFilter, state.taskState])

  const totalHoursFinal = useMemo(() => {
    return allTasksWithCustom.reduce((acc, { task }) => acc + (task.estimatedHours || 0), 0)
  }, [allTasksWithCustom])

  const statusCountsFinal = useMemo(() => {
    const counts: Record<TaskStatus, number> = { pending: 0, 'in-progress': 0, completed: 0, blocked: 0 }
    allTasksWithCustom.forEach(({ task }) => {
      const st = state.taskState[task.id]?.status ?? 'pending'
      counts[st] += 1
    })
    return counts
  }, [allTasksWithCustom, state.taskState])

  // ---- Update task state (status / owner / due / notes) -----------------
  const updateTaskField = useCallback((taskId: string, field: 'status' | 'owner' | 'dueDate' | 'notes', value: string) => {
    setState((prev) => ({
      ...prev,
      taskState: {
        ...prev.taskState,
        [taskId]: {
          ...(prev.taskState[taskId] || {}),
          [field]: value,
        },
      },
    }))
  }, [])

  // ---- Update spec value ----------------------------------------------
  const updateSpecValue = useCallback((specId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      specValues: {
        ...prev.specValues,
        [specId]: value,
      },
    }))
  }, [])

  // ---- Update cover info ----------------------------------------------
  const updateCover = useCallback((field: keyof SOWCoverInfo, value: string) => {
    setState((prev) => ({ ...prev, cover: { ...prev.cover, [field]: value } }))
  }, [])

  // ---- Reset ----------------------------------------------------------
  const resetState = useCallback(() => {
    if (!window.confirm(t('sow.export.resetConfirm'))) return
    setState(DEFAULT_STATE)
    setCustomTasksRegistry({})
    setMilestones(DEFAULT_MILESTONES)
    setActiveServiceFilter('all')
    setActiveStatusFilter('all')
    toast.success('SOW reset to defaults')
  }, [t])

  // ---- Word export -----------------------------------------------------
  const handleExportWord = useCallback(async () => {
    try {
      await exportSowWord(
        {
          cover: state.cover,
          selectedServiceIds: state.selectedServiceIds,
          customServices: state.customServices,
          taskState: state.taskState,
          specValues: state.specValues,
          // Only registry entries for builtin services that are still selected
          // should be exported, so the doc matches what the user sees on screen.
          customTasksByBuiltinService: Object.fromEntries(
            Object.entries(customTasksRegistry).filter(
              ([sid]) => state.selectedServiceIds.includes(sid) && !state.customServices.some((cs) => cs.id === sid)
            )
          ),
          milestones,
        },
        MASSAPRO_LOGO_URL
      )
      toast.success('SOW downloaded as Word')
    } catch (err: any) {
      console.error(err)
      toast.error('Export failed: ' + (err?.message || 'unknown error'))
    }
  }, [state, customTasksRegistry, milestones])

  // ---- Toggle task expansion ------------------------------------------
  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }, [])

  // ---- Group services by category for display -------------------------
  const servicesByCategory = useMemo(() => {
    const map: Record<ServiceCategory, Service[]> = {
      channel: [],
      productivity: [],
      infrastructure: [],
      ops: [],
    }
    SERVICES.forEach((s) => map[s.category].push(s))
    return map
  }, [])

  const categoryOrder: ServiceCategory[] = ['channel', 'productivity', 'infrastructure', 'ops']

  // --------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: WHITE }}>
        <div className="text-center">
          <img src={MASSAPRO_LOGO_URL} alt="MassaPro Logo" className="h-16 w-16 mx-auto mb-3" />
          <p className="text-sm" style={{ color: JET }}>Loading MassaPro SOW Builder…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: WHITE, color: JET, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ====== Brand Banner ====== */}
      <div
        className="w-full"
        style={{
          background: `linear-gradient(135deg, ${LAVENDER} 0%, ${WHITE} 60%)`,
          borderBottom: `3px solid ${ORCHID}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <img
            src={MASSAPRO_LOGO_URL}
            alt="MassaPro Logo"
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg shadow-sm"
            style={{ background: WHITE }}
          />
          <div className="flex-1">
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: ORCHID, fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }}
            >
              {t('sow.title')}
            </h1>
            <p className="text-sm mt-1" style={{ color: JET }}>{t('sow.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExportWord}
              className="text-white shadow-md"
              style={{ background: ORCHID, borderColor: ORCHID }}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('sow.export.word')}
            </Button>
            <Button
              variant="outline"
              onClick={resetState}
              className="border-2"
              style={{ borderColor: ORCHID, color: ORCHID }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('sow.export.reset')}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ====== Cover / Project Info ====== */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Layout className="h-5 w-5" />
              {t('sow.header')} — Cover
            </CardTitle>
            <CardDescription>{t('sow.cover.massaproTagline')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName" style={{ color: JET }}>{t('sow.cover.clientName')}</Label>
                <Input
                  id="clientName"
                  value={state.cover.clientName}
                  onChange={(e) => updateCover('clientName', e.target.value)}
                  placeholder="e.g., Acme Inc."
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="projectName" style={{ color: JET }}>{t('sow.cover.projectName')}</Label>
                <Input
                  id="projectName"
                  value={state.cover.projectName}
                  onChange={(e) => updateCover('projectName', e.target.value)}
                  placeholder="e.g., Contact Center Implementation"
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" style={{ color: JET }}>{t('sow.cover.date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={state.cover.date}
                  onChange={(e) => updateCover('date', e.target.value)}
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="version" style={{ color: JET }}>{t('sow.cover.version')}</Label>
                <Input
                  id="version"
                  value={state.cover.version}
                  onChange={(e) => updateCover('version', e.target.value)}
                  placeholder="v1.0"
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preparedBy" style={{ color: JET }}>{t('sow.cover.preparedBy')}</Label>
                <Input
                  id="preparedBy"
                  value={state.cover.preparedBy}
                  onChange={(e) => updateCover('preparedBy', e.target.value)}
                  placeholder="MassaPro Solutions Architect"
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="overview" style={{ color: JET }}>{t('sow.section.overview')}</Label>
                <Textarea
                  id="overview"
                  value={state.cover.overview}
                  onChange={(e) => updateCover('overview', e.target.value)}
                  placeholder="Brief overview of the engagement: client background, business objectives, expected outcomes, timeline, and key assumptions."
                  rows={4}
                  style={{ borderColor: LAVENDER }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ====== Services Selection ====== */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                  <Settings className="h-5 w-5" />
                  {t('sow.services.title')}
                </CardTitle>
                <CardDescription className="mt-1">{t('sow.services.subtitle')}</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAddCustomService((v) => !v)}
                className="border-2"
                style={{ borderColor: ORCHID, color: ORCHID }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('sow.services.addCustom')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Add custom service form */}
            {showAddCustomService && (
              <div
                className="rounded-lg p-4 space-y-3"
                style={{ background: LAVENDER, border: `1px solid ${ORCHID}` }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label style={{ color: JET }}>{t('sow.services.customName')}</Label>
                    <Input
                      value={customServiceDraft.name}
                      onChange={(e) => setCustomServiceDraft((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Custom Web Chat"
                      style={{ background: WHITE, borderColor: LAVENDER }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label style={{ color: JET }}>{t('sow.services.customDesc')}</Label>
                    <Input
                      value={customServiceDraft.description}
                      onChange={(e) => setCustomServiceDraft((p) => ({ ...p, description: e.target.value }))}
                      placeholder="One-line description of the custom service"
                      style={{ background: WHITE, borderColor: LAVENDER }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addCustomService} style={{ background: ORCHID, color: WHITE }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('sow.services.customAdd')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddCustomService(false)}>
                    <X className="h-4 w-4 mr-2" />
                    {t('general.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Built-in services grouped by category */}
            {categoryOrder.map((cat) => {
              const services = servicesByCategory[cat]
              if (!services || services.length === 0) return null
              return (
                <div key={cat}>
                  <h3
                    className="text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: JET }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {services.map((svc) => {
                      const isSelected = state.selectedServiceIds.includes(svc.id)
                      const Icon = ICONS[svc.icon] || Sparkles
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={cn(
                            'text-start rounded-lg p-3 border-2 transition-all flex items-start gap-3',
                            'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1'
                          )}
                          style={{
                            borderColor: isSelected ? ORCHID : LAVENDER,
                            background: isSelected ? LAVENDER : WHITE,
                            boxShadow: isSelected ? `0 1px 0 0 ${ORCHID}33` : 'none',
                          }}
                        >
                          <div
                            className="flex-shrink-0 rounded-md p-2"
                            style={{
                              background: isSelected ? ORCHID : LAVENDER,
                              color: isSelected ? WHITE : ORCHID,
                            }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm" style={{ color: JET }}>
                                {brandClean(svc.name)}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: ORCHID }} />
                              )}
                            </div>
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: JET, opacity: 0.75 }}>
                              {brandClean(svc.description)}
                            </p>
                            <span className="text-xs font-medium" style={{ color: ORCHID }}>
                              {svc.tasks.length} {svc.tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Custom services */}
            {state.customServices.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>
                  Custom Services
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {state.customServices.map((svc) => {
                    const isSelected = state.selectedServiceIds.includes(svc.id)
                    const Icon = Sparkles
                    return (
                      <div
                        key={svc.id}
                        className="rounded-lg p-3 border-2 flex items-start gap-3"
                        style={{
                          borderColor: isSelected ? ORCHID : LAVENDER,
                          background: isSelected ? LAVENDER : WHITE,
                        }}
                      >
                        <div
                          className="flex-shrink-0 rounded-md p-2 cursor-pointer"
                          style={{ background: isSelected ? ORCHID : LAVENDER, color: isSelected ? WHITE : ORCHID }}
                          onClick={() => toggleService(svc.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleService(svc.id) }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm" style={{ color: JET }}>{brandClean(svc.name)}</span>
                            <button
                              type="button"
                              onClick={() => removeCustomService(svc.id)}
                              className="text-xs hover:underline"
                              style={{ color: '#EF4444' }}
                              title={t('sow.services.customRemove')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: JET, opacity: 0.75 }}>
                            {brandClean(svc.description)}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleService(svc.id)}
                            className="text-xs font-medium mt-1"
                            style={{ color: ORCHID }}
                          >
                            {isSelected ? 'Selected ✓' : 'Click to include'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selected services summary */}
            <div
              className="rounded-lg p-4 flex flex-wrap gap-2 items-center"
              style={{ background: LAVENDER }}
            >
              <span className="text-sm font-semibold" style={{ color: JET }}>
                {t('sow.services.selected')} ({state.selectedServiceIds.length}):
              </span>
              {allServices.length === 0 ? (
                <span className="text-sm italic" style={{ color: JET, opacity: 0.6 }}>
                  {t('sow.services.none')}
                </span>
              ) : (
                allServices.map((svc) => (
                  <Badge
                    key={svc.id}
                    style={{ background: ORCHID, color: WHITE, border: 'none' }}
                  >
                    {brandClean(svc.name)}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ====== Tasks Management ====== */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                  <Filter className="h-5 w-5" />
                  {t('sow.tasks.title')}
                </CardTitle>
                <CardDescription className="mt-1">{t('sow.tasks.subtitle')}</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAddCustomTask((v) => !v)}
                className="border-2"
                style={{ borderColor: ORCHID, color: ORCHID }}
                disabled={allServices.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('sow.tasks.addCustom')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {/* Add custom task form */}
            {showAddCustomTask && (
              <div
                className="rounded-lg p-4 space-y-3"
                style={{ background: LAVENDER, border: `1px solid ${ORCHID}` }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label style={{ color: JET }}>{t('sow.tasks.customTitle')}</Label>
                    <Input
                      value={customTaskDraft.title}
                      onChange={(e) => setCustomTaskDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Custom integration testing"
                      style={{ background: WHITE, borderColor: LAVENDER }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label style={{ color: JET }}>Service</Label>
                    <Select
                      value={customTaskDraft.serviceId || allServices[0]?.id || ''}
                      onValueChange={(v) => setCustomTaskDraft((p) => ({ ...p, serviceId: v }))}
                    >
                      <SelectTrigger style={{ background: WHITE, borderColor: LAVENDER }}>
                        <SelectValue placeholder="Pick service" />
                      </SelectTrigger>
                      <SelectContent>
                        {allServices.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{brandClean(s.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: JET }}>{t('sow.tasks.customDesc')}</Label>
                  <Textarea
                    value={customTaskDraft.description}
                    onChange={(e) => setCustomTaskDraft((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What needs to be done in this task?"
                    rows={2}
                    style={{ background: WHITE, borderColor: LAVENDER }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addCustomTask} style={{ background: ORCHID, color: WHITE }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('sow.tasks.customAdd')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddCustomTask(false)}>
                    <X className="h-4 w-4 mr-2" />
                    {t('general.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Filter: by service */}
            <div>
              <Label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: JET }}>
                {t('sow.tasks.filter')}
              </Label>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={activeServiceFilter === 'all'}
                  onClick={() => setActiveServiceFilter('all')}
                  label={t('sow.tasks.filterAll')}
                  count={allTasksWithCustom.length}
                />
                {allServices.map((svc) => (
                  <FilterChip
                    key={svc.id}
                    active={activeServiceFilter === svc.id}
                    onClick={() => setActiveServiceFilter(svc.id)}
                    label={brandClean(svc.name)}
                    count={allTasksWithCustom.filter((tt) => tt.serviceId === svc.id).length}
                  />
                ))}
              </div>
            </div>

            {/* Filter: by status */}
            <div>
              <Label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: JET }}>
                {t('sow.tasks.status')}
              </Label>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={activeStatusFilter === 'all'}
                  onClick={() => setActiveStatusFilter('all')}
                  label={t('sow.tasks.filterAll')}
                  count={allTasksWithCustom.length}
                />
                <FilterChip
                  active={activeStatusFilter === 'pending'}
                  onClick={() => setActiveStatusFilter('pending')}
                  label={t('sow.tasks.filterPending')}
                  count={statusCountsFinal.pending}
                  icon={<Circle className="h-3 w-3" />}
                />
                <FilterChip
                  active={activeStatusFilter === 'in-progress'}
                  onClick={() => setActiveStatusFilter('in-progress')}
                  label={t('sow.tasks.filterProgress')}
                  count={statusCountsFinal['in-progress']}
                  icon={<Clock className="h-3 w-3" />}
                />
                <FilterChip
                  active={activeStatusFilter === 'completed'}
                  onClick={() => setActiveStatusFilter('completed')}
                  label={t('sow.tasks.filterCompleted')}
                  count={statusCountsFinal.completed}
                  icon={<CheckCircle2 className="h-3 w-3" />}
                />
                <FilterChip
                  active={activeStatusFilter === 'blocked'}
                  onClick={() => setActiveStatusFilter('blocked')}
                  label={t('sow.tasks.filterBlocked')}
                  count={statusCountsFinal.blocked}
                  icon={<XCircle className="h-3 w-3" />}
                />
              </div>
            </div>

            {/* Task list */}
            <div className="space-y-2">
              {filteredTasksFinal.length === 0 ? (
                <div
                  className="rounded-lg p-8 text-center"
                  style={{ background: LAVENDER, color: JET }}
                >
                  <p className="text-sm italic">{t('sow.tasks.empty')}</p>
                </div>
              ) : (
                filteredTasksFinal.map(({ task, serviceName, serviceId }) => {
                  const tState = state.taskState[task.id] || {}
                  const status = tState.status || 'pending'
                  const expanded = expandedTasks[task.id] ?? true
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border-2 overflow-hidden"
                      style={{ borderColor: LAVENDER, background: WHITE }}
                    >
                      {/* Header row */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer"
                        onClick={() => toggleExpand(task.id)}
                        style={{ borderBottom: expanded ? `1px solid ${LAVENDER}` : 'none' }}
                      >
                        <button
                          type="button"
                          className="flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(task.id) }}
                          style={{ color: ORCHID }}
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <StatusDot status={status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: JET }}>
                              {brandClean(task.title)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}
                            >
                              {brandClean(serviceName)}
                            </Badge>
                            <span className="text-xs" style={{ color: JET, opacity: 0.6 }}>
                              · {t('sow.tasks.estHours')}: {task.estimatedHours || 0}h
                            </span>
                          </div>
                          {!expanded && (
                            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: JET, opacity: 0.65 }}>
                              {brandClean(task.description)}
                            </p>
                          )}
                        </div>
                      </div>
                      {expanded && (
                        <div className="p-3 pt-3 space-y-3">
                          <p className="text-sm" style={{ color: JET }}>
                            {brandClean(task.description)}
                          </p>
                          {/* Sub-tasks */}
                          {task.subTasks && task.subTasks.length > 0 && (
                            <div className="space-y-1.5 ps-4 border-s-2" style={{ borderColor: LAVENDER }}>
                              {task.subTasks.map((sub) => {
                                const subState = state.taskState[sub.id] || {}
                                const subStatus = subState.status || 'pending'
                                return (
                                  <div key={sub.id} className="flex items-start gap-2">
                                    <StatusDot status={subStatus} small />
                                    <div className="flex-1">
                                      <span className="text-sm font-medium" style={{ color: JET }}>
                                        {brandClean(sub.title)}
                                      </span>
                                      <span className="text-xs block" style={{ color: JET, opacity: 0.7 }}>
                                        {brandClean(sub.description)}
                                      </span>
                                    </div>
                                    <Select
                                      value={subStatus}
                                      onValueChange={(v) => updateTaskField(sub.id, 'status', v)}
                                    >
                                      <SelectTrigger
                                        className="h-7 text-xs w-32"
                                        style={{ borderColor: LAVENDER }}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((st) => (
                                          <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {/* Editor grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase" style={{ color: JET }}>
                                {t('sow.tasks.status')}
                              </Label>
                              <Select
                                value={status}
                                onValueChange={(v) => updateTaskField(task.id, 'status', v)}
                              >
                                <SelectTrigger className="h-9" style={{ borderColor: LAVENDER }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((st) => (
                                    <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase" style={{ color: JET }}>
                                {t('sow.tasks.owner')}
                              </Label>
                              <Input
                                value={tState.owner || ''}
                                onChange={(e) => updateTaskField(task.id, 'owner', e.target.value)}
                                placeholder="e.g., J. Perez"
                                className="h-9"
                                style={{ borderColor: LAVENDER }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase" style={{ color: JET }}>
                                {t('sow.tasks.dueDate')}
                              </Label>
                              <Input
                                type="date"
                                value={tState.dueDate || ''}
                                onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)}
                                className="h-9"
                                style={{ borderColor: LAVENDER }}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
                              <Label className="text-xs uppercase" style={{ color: JET }}>
                                {t('sow.tasks.notes')}
                              </Label>
                              <Input
                                value={tState.notes || ''}
                                onChange={(e) => updateTaskField(task.id, 'notes', e.target.value)}
                                placeholder="Free-text notes / dependencies / links"
                                style={{ borderColor: LAVENDER }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Total hours */}
            <div
              className="flex items-center justify-between rounded-lg p-4"
              style={{ background: LAVENDER }}
            >
              <span className="font-semibold" style={{ color: JET }}>
                {t('sow.tasks.totalHours')}
              </span>
              <span className="text-xl font-bold" style={{ color: ORCHID }}>
                {totalHoursFinal}h
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ====== Tech Specs ====== */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <FileText className="h-5 w-5" />
              {t('sow.specs.title')}
            </CardTitle>
            <CardDescription>{t('sow.specs.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {allServices.length === 0 ? (
              <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
                <p className="text-sm italic" style={{ color: JET }}>{t('sow.services.none')}</p>
              </div>
            ) : (
              allServices.map((svc) => (
                <div key={svc.id}>
                  <h3 className="font-semibold text-base mb-2" style={{ color: ORCHID }}>
                    {brandClean(svc.name)}
                  </h3>
                  {svc.techSpecs.length === 0 ? (
                    <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>
                      No tech specs.
                    </p>
                  ) : (
                    <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: LAVENDER }}>
                      <div
                        className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide p-2"
                        style={{ background: LAVENDER, color: JET }}
                      >
                        <div className="col-span-3">{t('sow.specs.field')}</div>
                        <div className="col-span-5">{t('sow.specs.description')}</div>
                        <div className="col-span-4">{t('sow.specs.value')}</div>
                      </div>
                      {svc.techSpecs.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-12 gap-2 p-2 border-t"
                          style={{ borderColor: LAVENDER, background: WHITE }}
                        >
                          <div className="col-span-3 font-medium text-sm" style={{ color: JET }}>
                            {row.field}
                          </div>
                          <div className="col-span-5 text-sm" style={{ color: JET, opacity: 0.85 }}>
                            {row.description}
                            {row.example && (
                              <span className="text-xs block" style={{ color: JET, opacity: 0.6 }}>
                                e.g., {row.example}
                              </span>
                            )}
                          </div>
                          <div className="col-span-4">
                            <Input
                              value={state.specValues[row.id] || ''}
                              onChange={(e) => updateSpecValue(row.id, e.target.value)}
                              placeholder={row.example || ''}
                              className="h-8 text-sm"
                              style={{ borderColor: LAVENDER }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ====== Project Milestones ====== */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <CheckCircle2 className="h-5 w-5" />
              {t('sow.section.milestones')}
            </CardTitle>
            <CardDescription>
              {language === 'es'
                ? 'Edita las fechas objetivo y el estado de cada hito.'
                : language === 'he'
                  ? 'ערוך את תאריכי היעד והסטטוס של כל אבן דרך.'
                  : 'Edit the target dates and status of each milestone.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: LAVENDER }}>
              <div
                className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide p-2"
                style={{ background: LAVENDER, color: JET }}
              >
                <div className="col-span-6">{t('sow.tasks.customTitle')}</div>
                <div className="col-span-3">{t('sow.tasks.dueDate')}</div>
                <div className="col-span-3">{t('sow.tasks.status')}</div>
              </div>
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-12 gap-2 p-2 border-t items-center"
                  style={{ borderColor: LAVENDER, background: WHITE }}
                >
                  <div className="col-span-6">
                    <Input
                      value={m.task}
                      onChange={(e) => updateMilestone(m.id, 'task', e.target.value)}
                      className="h-8 text-sm"
                      style={{ borderColor: LAVENDER }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={m.targetDate}
                      onChange={(e) => updateMilestone(m.id, 'targetDate', e.target.value)}
                      placeholder="XX/XX/2026"
                      className="h-8 text-sm"
                      style={{ borderColor: LAVENDER }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={m.status}
                      onChange={(e) => updateMilestone(m.id, 'status', e.target.value)}
                      placeholder="Pending / Scheduled / Complete"
                      className="h-8 text-sm"
                      style={{ borderColor: LAVENDER }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border-2'
      )}
      style={{
        background: active ? ORCHID : WHITE,
        color: active ? WHITE : JET,
        borderColor: ORCHID,
      }}
    >
      {icon}
      {label}
      <span
        className="rounded-full px-1.5 text-[10px] font-bold"
        style={{
          background: active ? WHITE : LAVENDER,
          color: active ? ORCHID : JET,
        }}
      >
        {count}
      </span>
    </button>
  )
}

function StatusDot({ status, small }: { status: TaskStatus; small?: boolean }) {
  const size = small ? 'h-3 w-3' : 'h-4 w-4'
  const colorMap: Record<TaskStatus, string> = {
    pending: '#94A3B8',
    'in-progress': '#F59E0B',
    completed: '#10B981',
    blocked: '#EF4444',
  }
  return <span className={cn('inline-block rounded-full flex-shrink-0', size)} style={{ background: colorMap[status] }} />
}
