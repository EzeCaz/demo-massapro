'use client'

import { useState, useMemo } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  ListChecks, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, XCircle,
} from 'lucide-react'
import { useSOWState, brandClean, STATUS_LABELS, type TaskStatus } from './useSOWState'
import { cn } from '@/lib/utils'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

// SOWTasksSubTab — renders just the task tracker panel of the SOW Builder
// with the same per-task editor (status / owner / due date / notes), the
// same filter chips (by service and by status), and the same total hours
// summary. Reads/writes the same localStorage state as /sow.
export default function SOWTasksSubTab() {
  const { t } = useLanguage()
  const { allServices, allTasks, totalHours, state, updateTaskField, hydrated } = useSOWState()

  const [activeServiceFilter, setActiveServiceFilter] = useState<string>('all')
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all')
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})

  const statusCounts = useMemo(() => {
    const c: Record<TaskStatus, number> = { pending: 0, 'in-progress': 0, completed: 0, blocked: 0 }
    allTasks.forEach(({ task }) => {
      const st = state.taskState[task.id]?.status ?? 'pending'
      c[st] += 1
    })
    return c
  }, [allTasks, state.taskState])

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

  const toggleExpand = (id: string) => setExpandedTasks((p) => ({ ...p, [id]: !p[id] }))

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading tasks…</div>
      </div>
    )
  }

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
          <ListChecks className="h-5 w-5" />
          {t('sow.tasks.title')}
        </CardTitle>
        <CardDescription>{t('sow.tasks.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
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
              count={allTasks.length}
            />
            {allServices.map((svc) => (
              <FilterChip
                key={svc.id}
                active={activeServiceFilter === svc.id}
                onClick={() => setActiveServiceFilter(svc.id)}
                label={brandClean(svc.name)}
                count={allTasks.filter((tt) => tt.serviceId === svc.id).length}
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
              count={allTasks.length}
            />
            <FilterChip
              active={activeStatusFilter === 'pending'}
              onClick={() => setActiveStatusFilter('pending')}
              label={t('sow.tasks.filterPending')}
              count={statusCounts.pending}
              icon={<Circle className="h-3 w-3" />}
            />
            <FilterChip
              active={activeStatusFilter === 'in-progress'}
              onClick={() => setActiveStatusFilter('in-progress')}
              label={t('sow.tasks.filterProgress')}
              count={statusCounts['in-progress']}
              icon={<Clock className="h-3 w-3" />}
            />
            <FilterChip
              active={activeStatusFilter === 'completed'}
              onClick={() => setActiveStatusFilter('completed')}
              label={t('sow.tasks.filterCompleted')}
              count={statusCounts.completed}
              icon={<CheckCircle2 className="h-3 w-3" />}
            />
            <FilterChip
              active={activeStatusFilter === 'blocked'}
              onClick={() => setActiveStatusFilter('blocked')}
              label={t('sow.tasks.filterBlocked')}
              count={statusCounts.blocked}
              icon={<XCircle className="h-3 w-3" />}
            />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER, color: JET }}>
              <p className="text-sm italic">{t('sow.tasks.empty')}</p>
            </div>
          ) : (
            filteredTasks.map(({ task, serviceName, serviceId }) => {
              const tState = state.taskState[task.id] || {}
              const status = tState.status || 'pending'
              const expanded = expandedTasks[task.id] ?? true
              return (
                <div
                  key={task.id}
                  className="rounded-lg border-2 overflow-hidden"
                  style={{ borderColor: LAVENDER, background: WHITE }}
                >
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
                    </div>
                  </div>
                  {expanded && (
                    <div className="p-3 pt-3 space-y-3">
                      <p className="text-sm" style={{ color: JET }}>{brandClean(task.description)}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase" style={{ color: JET }}>
                            {t('sow.tasks.status')}
                          </Label>
                          <Select value={status} onValueChange={(v) => updateTaskField(task.id, 'status', v)}>
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
        <div className="flex items-center justify-between rounded-lg p-4" style={{ background: LAVENDER }}>
          <span className="font-semibold" style={{ color: JET }}>{t('sow.tasks.totalHours')}</span>
          <span className="text-xl font-bold" style={{ color: ORCHID }}>{totalHours}h</span>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterChip({
  active, onClick, label, count, icon,
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
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border-2"
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

function StatusDot({ status }: { status: TaskStatus }) {
  const size = 'h-4 w-4'
  const colorMap: Record<TaskStatus, string> = {
    pending: '#94A3B8',
    'in-progress': '#F59E0B',
    completed: '#10B981',
    blocked: '#EF4444',
  }
  return <span className={cn('inline-block rounded-full flex-shrink-0', size)} style={{ background: colorMap[status] }} />
}
