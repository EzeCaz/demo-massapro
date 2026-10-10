'use client'

// Shared hook for reading the SOW Builder localStorage state from any
// component (used by the platform's SOWSpecsSubTab and SOWTasksSubTab
// to render partial views of the same data the /sow page renders in full).
//
// State shape (must match SOWBuilder's STORAGE_KEY='massapro-sow-state-v1'):
//   {
//     cover: { clientName, projectName, date, version, preparedBy, overview },
//     selectedServiceIds: string[],
//     customServices: CustomService[],
//     taskState: { [taskId]: { status, owner, dueDate, notes } },
//     specValues: { [specId]: string },
//   }
//
// Plus a separate key 'massapro-sow-state-v1-custom-tasks' for tasks added
// to built-in services, and 'massapro-sow-state-v1-milestones' for the
// milestones editor.

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  SERVICES,
  CATEGORY_LABELS,
  brandClean,
  STATUS_LABELS,
  DEFAULT_MILESTONES,
  type ServiceTask,
  type TaskStatus,
  type Service,
  type MilestoneRow,
} from '@/lib/sow-data'
const STORAGE_KEY = 'massapro-sow-state-v1'

export interface SOWState {
  cover: {
    clientName: string
    clientDemo: string
    projectName: string
    date: string
    version: string
    preparedBy: string
    overview: string
    clientLogo?: string
  }
  selectedServiceIds: string[]
  customServices: any[]
  taskState: Record<string, { status?: TaskStatus; owner?: string; dueDate?: string; notes?: string }>
  specValues: Record<string, string>
}

const DEFAULT_STATE: SOWState = {
  cover: {
    clientName: '',
    clientDemo: '',
    projectName: '',
    date: new Date().toISOString().split('T')[0],
    version: 'v1.0',
    preparedBy: '',
    overview: '',
    clientLogo: '',
  },
  selectedServiceIds: SERVICES.filter((s) => s.enabledByDefault).map((s) => s.id),
  customServices: [],
  taskState: {},
  specValues: {},
}

export function useSOWState() {
  const [state, setState] = useState<SOWState>(DEFAULT_STATE)
  const [customTasksRegistry, setCustomTasksRegistry] = useState<Record<string, ServiceTask[]>>({})
  const [milestones, setMilestones] = useState<MilestoneRow[]>(DEFAULT_MILESTONES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SOWState
        setState({
          cover: { ...DEFAULT_STATE.cover, ...parsed.cover },
          selectedServiceIds: parsed.selectedServiceIds ?? DEFAULT_STATE.selectedServiceIds,
          customServices: parsed.customServices ?? [],
          taskState: parsed.taskState ?? {},
          specValues: parsed.specValues ?? {},
        })
      }
      const rawTasks = localStorage.getItem(STORAGE_KEY + '-custom-tasks')
      if (rawTasks) setCustomTasksRegistry(JSON.parse(rawTasks))
      const rawMilestones = localStorage.getItem(STORAGE_KEY + '-milestones')
      if (rawMilestones) setMilestones(JSON.parse(rawMilestones))
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Listen for cross-tab / cross-component localStorage changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as SOWState
          setState({
            cover: { ...DEFAULT_STATE.cover, ...parsed.cover },
            selectedServiceIds: parsed.selectedServiceIds ?? DEFAULT_STATE.selectedServiceIds,
            customServices: parsed.customServices ?? [],
            taskState: parsed.taskState ?? {},
            specValues: parsed.specValues ?? {},
          })
        } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Derived: all selected services (builtin + custom) with custom tasks merged in
  const allServices = useMemo(() => {
    const builtin = SERVICES.filter((s) => state.selectedServiceIds.includes(s.id)).map((s) => ({
      ...s,
      tasks: [...s.tasks, ...(customTasksRegistry[s.id] ?? [])],
    })) as Service[]
    return [...builtin, ...state.customServices]
  }, [state.selectedServiceIds, state.customServices, customTasksRegistry])

  const allTasks = useMemo(() => {
    const list: { task: ServiceTask; serviceName: string; serviceId: string }[] = []
    allServices.forEach((svc) => {
      svc.tasks.forEach((task) => {
        list.push({ task, serviceName: svc.name, serviceId: svc.id })
      })
    })
    return list
  }, [allServices])

  const totalHours = useMemo(() => allTasks.reduce((acc, { task }) => acc + (task.estimatedHours || 0), 0), [allTasks])

  // Persist spec/task state changes back to localStorage so the /sow page
  // picks them up. We only update the parts we own.
  const persistPartial = useCallback(
    (partial: Partial<SOWState>) => {
      setState((prev) => {
        const next = { ...prev, ...partial }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    []
  )

  const updateTaskField = useCallback(
    (taskId: string, field: 'status' | 'owner' | 'dueDate' | 'notes', value: string) => {
      setState((prev) => {
        const next = {
          ...prev,
          taskState: {
            ...prev.taskState,
            [taskId]: { ...(prev.taskState[taskId] || {}), [field]: value },
          },
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    []
  )

  const updateSpecValue = useCallback(
    (specId: string, value: string) => {
      setState((prev) => {
        const next = {
          ...prev,
          specValues: { ...prev.specValues, [specId]: value },
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    []
  )

  const updateMilestone = useCallback((id: string, field: keyof MilestoneRow, value: string) => {
    setMilestones((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
      try {
        localStorage.setItem(STORAGE_KEY + '-milestones', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  return {
    state,
    allServices,
    allTasks,
    totalHours,
    milestones,
    hydrated,
    updateTaskField,
    updateSpecValue,
    updateMilestone,
    persistPartial,
  }
}

export { SERVICES, CATEGORY_LABELS, brandClean, STATUS_LABELS, DEFAULT_MILESTONES }
export type { TaskStatus, Service, MilestoneRow, ServiceTask }

