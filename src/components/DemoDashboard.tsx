'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, X, Check, Loader2, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Search, Eye, Filter,
  Undo2, Redo2,
} from 'lucide-react'
import ScenarioForm from './ScenarioForm'
import CollaboratorPanel from './CollaboratorPanel'
import CommentsPanel from './CommentsPanel'
import ChangeLogPanel from './ChangeLogPanel'
import AdminNotesPanel from './AdminNotesPanel'
import TranslationPanel from './TranslationPanel'
import ScenarioExport from './ScenarioExport'

type SortField = 'name' | 'status' | 'updatedAt' | 'createdAt' | 'company' | 'overview' | 'website'
type SortDir = 'asc' | 'desc'

type ColFilterKey = 'name' | 'status' | 'company' | 'website' | 'overview' | 'updatedAt' | 'createdAt'
type ColFilters = Record<ColFilterKey, string>

const COL_FILTER_KEYS: ColFilterKey[] = ['name', 'status', 'company', 'website', 'overview', 'updatedAt', 'createdAt']

// Editable field definitions — maps table column key to the API field name
type EditableField = 'name' | 'status' | 'companyWebsiteUrl' | 'overview' | 'company'

// Fields editable for ALL users
const EDITABLE_FIELDS: { colKey: string; apiField: EditableField; type: 'text' | 'select' | 'company-select' }[] = [
  { colKey: 'name', apiField: 'name', type: 'text' },
  { colKey: 'status', apiField: 'status', type: 'select' },
  { colKey: 'company', apiField: 'company', type: 'company-select' },
  { colKey: 'website', apiField: 'companyWebsiteUrl', type: 'text' },
  { colKey: 'overview', apiField: 'overview', type: 'text' },
]

// Order of editable columns for Tab navigation
const EDITABLE_COL_ORDER = ['name', 'status', 'company', 'website', 'overview']

// Undo/Redo history entry
interface UndoEntry {
  scenarioId: string
  apiField: EditableField
  oldValue: string
  newValue: string
  clientId?: string // for company edits
}

function getColValue(scenario: any, key: ColFilterKey): string {
  switch (key) {
    case 'name': return scenario.name || ''
    case 'status': return scenario.status || ''
    case 'company': return scenario.client?.company || scenario.client?.name || ''
    case 'website': return scenario.companyWebsiteUrl || ''
    case 'overview': return scenario.overview || ''
    case 'updatedAt': return scenario.updatedAt ? new Date(scenario.updatedAt).toLocaleDateString() : ''
    case 'createdAt': return scenario.createdAt ? new Date(scenario.createdAt).toLocaleDateString() : ''
    default: return ''
  }
}

// Get raw value for editing from a scenario object
function getEditValue(scenario: any, apiField: EditableField): string {
  if (apiField === 'companyWebsiteUrl') return scenario.companyWebsiteUrl || ''
  if (apiField === 'company') return scenario.client?.company || ''
  return (scenario as any)[apiField] || ''
}

export default function DemoDashboard() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  const [activeTab, setActiveTab] = useState<string>('form')
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState('')

  // Filters & Sort
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<'table' | 'detail'>('table')

  // Per-column filters
  const [colFilters, setColFilters] = useState<ColFilters>(() => {
    const init: any = {}
    COL_FILTER_KEYS.forEach(k => init[k] = '')
    return init as ColFilters
  })
  const [openFilterCol, setOpenFilterCol] = useState<ColFilterKey | null>(null)

  // Row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ scenarioId: string; colKey: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  // Company-select mode: 'select' (dropdown) or 'input' (type new)
  const [companyMode, setCompanyMode] = useState<'select' | 'input'>('select')
  const [newCompanyName, setNewCompanyName] = useState('')

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([])
  const [isUndoing, setIsUndoing] = useState(false)

  // Saving cells tracking
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set()) // "scenarioId:colKey"

  // Table container ref for keyboard scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Fetch scenarios
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed to fetch scenarios')
      return res.json()
    },
  })

  // Filtered & sorted scenarios
  const filteredScenarios = useMemo(() => {
    let list = [...scenarios]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.overview?.toLowerCase().includes(q) ||
        s.client?.name?.toLowerCase().includes(q) ||
        s.client?.company?.toLowerCase().includes(q) ||
        s.companyWebsiteUrl?.toLowerCase().includes(q)
      )
    }

    for (const key of COL_FILTER_KEYS) {
      const f = colFilters[key]
      if (!f) continue
      const q = f.toLowerCase()
      list = list.filter((s: any) => getColValue(s, key).toLowerCase().includes(q))
    }

    list.sort((a: any, b: any) => {
      let valA: any
      let valB: any

      switch (sortField) {
        case 'name':
          valA = (a.name || '').toLowerCase()
          valB = (b.name || '').toLowerCase()
          break
        case 'status':
          valA = a.status || ''
          valB = b.status || ''
          break
        case 'company':
          valA = (a.client?.company || '').toLowerCase()
          valB = (b.client?.company || '').toLowerCase()
          break
        case 'overview':
          valA = (a.overview || '').toLowerCase()
          valB = (b.overview || '').toLowerCase()
          break
        case 'website':
          valA = (a.companyWebsiteUrl || '').toLowerCase()
          valB = (b.companyWebsiteUrl || '').toLowerCase()
          break
        case 'createdAt':
          valA = new Date(a.createdAt).getTime()
          valB = new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
        default:
          valA = new Date(a.updatedAt).getTime()
          valB = new Date(b.updatedAt).getTime()
          break
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [scenarios, searchQuery, colFilters, sortField, sortDir])

  const currentScenario = scenarios.find((s: any) => s.id === activeScenarioId) || null

  const getUniqueColValues = useCallback((key: ColFilterKey): string[] => {
    const set = new Set<string>()
    scenarios.forEach((s: any) => {
      const v = getColValue(s, key)
      if (v) set.add(v)
    })
    return Array.from(set).sort()
  }, [scenarios])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-vivid-blue" />
      : <ArrowDown className="h-3 w-3 ml-1 text-vivid-blue" />
  }

  const hasActiveFilter = (key: ColFilterKey) => colFilters[key] !== ''
  const anyColumnFilterActive = COL_FILTER_KEYS.some(k => colFilters[k] !== '')

  const clearAllColumnFilters = () => {
    setColFilters(() => {
      const init: any = {}
      COL_FILTER_KEYS.forEach(k => init[k] = '')
      return init as ColFilters
    })
  }

  // Selection helpers
  const allFilteredSelected = filteredScenarios.length > 0 && filteredScenarios.every((s: any) => selectedIds.has(s.id))
  const someFilteredSelected = filteredScenarios.some((s: any) => selectedIds.has(s.id)) && !allFilteredSelected

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredScenarios.map((s: any) => s.id)))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ============ INLINE EDITING ============

  // Check if user is admin
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  const isEditable = (colKey: string) => EDITABLE_FIELDS.some(f => f.colKey === colKey)

  // For admin: all content cells are interactive (hover + click stops propagation)
  // For non-admin: only editable fields show hover
  const isInteractiveCell = (colKey: string) => isAdmin || isEditable(colKey)

  const getApiField = (colKey: string): EditableField | undefined =>
    EDITABLE_FIELDS.find(f => f.colKey === colKey)?.apiField

  const getEditableType = (colKey: string): 'text' | 'select' | 'company-select' | undefined =>
    EDITABLE_FIELDS.find(f => f.colKey === colKey)?.type

  const startEditing = (scenarioId: string, colKey: string, scenario: any) => {
    if (!isEditable(colKey)) return
    const apiField = getApiField(colKey)!
    const val = getEditValue(scenario, apiField)
    setEditingCell({ scenarioId, colKey })
    setEditValue(val)
    // Initialize company mode
    if (colKey === 'company') {
      const existingCompanies = Array.from(new Set(
        scenarios.map((s: any) => s.client?.company).filter(Boolean) as string[]
      )).sort()
      if (existingCompanies.includes(val)) {
        setCompanyMode('select')
        setNewCompanyName('')
      } else {
        setCompanyMode('input')
        setNewCompanyName(val)
      }
    }
    // Focus the input after render
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue('')
    setCompanyMode('select')
    setNewCompanyName('')
  }

  const saveCell = async (scenarioId: string, colKey: string, value: string, pushToUndo = true) => {
    const apiField = getApiField(colKey)
    if (!apiField) return

    const scenario = scenarios.find((s: any) => s.id === scenarioId)
    if (!scenario) return

    const oldValue = getEditValue(scenario, apiField)

    // Don't save if unchanged
    if (oldValue === value) {
      cancelEditing()
      return
    }

    const cellKey = `${scenarioId}:${colKey}`
    setSavingCells(prev => new Set(prev).add(cellKey))

    try {
      let ok = false

      // Company edits go through the clients API
      if (apiField === 'company') {
        const clientId = scenario.client?.id
        if (!clientId) {
          toast.error('No client found')
          return
        }
        const res = await fetch('/api/admin/clients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: clientId, company: value }),
        })
        ok = res.ok
      } else {
        const res = await fetch(`/api/scenarios/${scenarioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [apiField]: value }),
        })
        ok = res.ok
      }

      if (ok) {
        toast.success('Field updated')
        if (pushToUndo) {
          setUndoStack(prev => [...prev, {
            scenarioId, apiField, oldValue, newValue: value,
            ...(apiField === 'company' ? { clientId: scenario.client?.id } : {}),
          }])
          setRedoStack([])
        }
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error('Failed to update')
      }
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev)
        next.delete(cellKey)
        return next
      })
      cancelEditing()
    }
  }

  // Tab navigation: move to next editable column on same row
  const handleTabNav = (scenarioId: string, colKey: string, shiftKey: boolean) => {
    const currentIdx = EDITABLE_COL_ORDER.indexOf(colKey)
    if (currentIdx === -1) return

    // Save current first
    const currentApiField = getApiField(colKey)
    if (currentApiField && editingCell) {
      // Save silently (no undo push since it's part of tab navigation)
      saveCell(scenarioId, colKey, editValue)
    }

    // Find next editable column
    const direction = shiftKey ? -1 : 1
    let nextIdx = currentIdx + direction
    if (nextIdx >= EDITABLE_COL_ORDER.length) nextIdx = 0
    if (nextIdx < 0) nextIdx = EDITABLE_COL_ORDER.length - 1

    const nextColKey = EDITABLE_COL_ORDER[nextIdx]
    if (isEditable(nextColKey)) {
      const scenario = scenarios.find((s: any) => s.id === scenarioId)
      if (scenario) {
        startEditing(scenarioId, nextColKey, scenario)
      }
    }
  }

  // Undo: restore previous value
  const handleUndo = async () => {
    if (undoStack.length === 0) return
    setIsUndoing(true)
    const entry = undoStack[undoStack.length - 1]

    try {
      let ok = false
      if (entry.apiField === 'company' && entry.clientId) {
        const res = await fetch('/api/admin/clients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: entry.clientId, company: entry.oldValue }),
        })
        ok = res.ok
      } else {
        const res = await fetch(`/api/scenarios/${entry.scenarioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [entry.apiField]: entry.oldValue }),
        })
        ok = res.ok
      }
      if (ok) {
        toast.success('Undo')
        setUndoStack(prev => prev.slice(0, -1))
        setRedoStack(prev => [...prev, entry])
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error('Undo failed')
      }
    } catch (error) {
      toast.error('Undo failed')
    } finally {
      setIsUndoing(false)
    }
  }

  // Redo: re-apply undone value
  const handleRedo = async () => {
    if (redoStack.length === 0) return
    setIsUndoing(true)
    const entry = redoStack[redoStack.length - 1]

    try {
      let ok = false
      if (entry.apiField === 'company' && entry.clientId) {
        const res = await fetch('/api/admin/clients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: entry.clientId, company: entry.newValue }),
        })
        ok = res.ok
      } else {
        const res = await fetch(`/api/scenarios/${entry.scenarioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [entry.apiField]: entry.newValue }),
        })
        ok = res.ok
      }
      if (ok) {
        toast.success('Redo')
        setRedoStack(prev => prev.slice(0, -1))
        setUndoStack(prev => [...prev, entry])
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      } else {
        toast.error('Redo failed')
      }
    } catch (error) {
      toast.error('Redo failed')
    } finally {
      setIsUndoing(false)
    }
  }

  // ============ END INLINE EDITING ============

  const handleAddScenario = async () => {
    if (!newScenarioName.trim()) {
      toast.error('Please enter a scenario name')
      return
    }
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newScenarioName, order: scenarios.length }),
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
        if (activeScenarioId === id) {
          setActiveScenarioId(null)
          setViewMode('table')
        }
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
        queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      }
    } catch (error) {
      toast.error('Failed to delete scenario')
    }
  }

  const openScenarioDetail = (scenario: any) => {
    setActiveScenarioId(scenario.id)
    setViewMode('detail')
    setActiveTab('form')
  }

  const backToTable = () => {
    setViewMode('table')
    setActiveScenarioId(null)
  }

  // ============ KEYBOARD SCROLL ============

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      const el = tableContainerRef.current
      if (!el) return

      const step = 60
      let handled = false

      switch (e.key) {
        case 'ArrowUp': el.scrollTop -= step; handled = true; break
        case 'ArrowDown': el.scrollTop += step; handled = true; break
      }

      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Column Header component with filter + sort
  const FilterableHeader = ({ colKey, sortFieldKey, label, className }: {
    colKey: ColFilterKey
    sortFieldKey: SortField
    label: string
    className?: string
  }) => {
    const isActive = hasActiveFilter(colKey)
    const editable = isEditable(colKey)
    return (
      <TableHead className={`select-none ${className || ''}`}>
        <div className="flex items-center gap-1">
          <button
            className="flex items-center gap-0.5 hover:text-vivid-blue transition-colors cursor-pointer"
            onClick={() => handleSort(sortFieldKey)}
          >
            <span className="text-xs font-medium">{label}</span>
            <SortIcon field={sortFieldKey} />
          </button>

          <Popover
            open={openFilterCol === colKey}
            onOpenChange={(open) => setOpenFilterCol(open ? colKey : null)}
          >
            <PopoverTrigger asChild>
              <button
                className={`p-0.5 rounded transition-colors cursor-pointer ${
                  isActive
                    ? 'text-vivid-blue hover:text-vivid-blue/80'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <Filter className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Filter: {label}</span>
                  {isActive && (
                    <button
                      className="text-[10px] text-vivid-blue hover:underline cursor-pointer"
                      onClick={() => {
                        setColFilters(prev => ({ ...prev, [colKey]: '' }))
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Type to filter..."
                  value={colFilters[colKey]}
                  onChange={(e) => setColFilters(prev => ({ ...prev, [colKey]: e.target.value }))}
                  className="h-7 text-xs"
                  autoFocus
                />
                {colKey === 'status' && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getUniqueColValues(colKey).map(val => (
                      <button
                        key={val}
                        className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                          colFilters[colKey].toLowerCase() === val.toLowerCase()
                            ? 'bg-vivid-blue text-white border-vivid-blue'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setColFilters(prev => ({
                            ...prev,
                            [colKey]: prev[colKey].toLowerCase() === val.toLowerCase() ? '' : val,
                          }))
                        }}
                      >
                        {val === 'submitted' ? t('dashboard.submitted') : val === 'draft' ? t('dashboard.draft') : val}
                      </button>
                    ))}
                  </div>
                )}
                {colKey !== 'status' && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {getUniqueColValues(colKey)
                      .filter(v => !colFilters[colKey] || v.toLowerCase().includes(colFilters[colKey].toLowerCase()))
                      .slice(0, 8)
                      .map(val => (
                        <button
                          key={val}
                          className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-muted truncate cursor-pointer transition-colors"
                          onClick={() => {
                            setColFilters(prev => ({ ...prev, [colKey]: val }))
                          }}
                        >
                          {val.length > 40 ? val.substring(0, 40) + '...' : val}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Pencil icon for editable columns */}
          {editable && (
            <Pencil className="h-2.5 w-2.5 text-muted-foreground/30" />
          )}
        </div>
      </TableHead>
    )
  }

  // Inline Editable Cell component
  const EditableCell = ({ scenario, colKey, children }: {
    scenario: any
    colKey: string
    children: React.ReactNode
  }) => {
    const isEditing = editingCell?.scenarioId === scenario.id && editingCell?.colKey === colKey
    const isSaving = savingCells.has(`${scenario.id}:${colKey}`)
    const editable = isEditable(colKey)

    if (!editable) {
      // Non-editable but still interactive for admin (hover + stop propagation)
      const interactive = isInteractiveCell(colKey)
      return (
        <TableCell
          className={`relative group ${interactive ? 'cursor-default' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <span className={interactive ? 'group-hover:ring-1 group-hover:ring-vivid-blue/20 group-hover:bg-vivid-blue/5 group-hover:rounded group-hover:px-0.5 transition-all' : ''}>
            {children}
          </span>
        </TableCell>
      )
    }

    if (isEditing) {
      const editType = getEditableType(colKey)

      // Common save/cancel button handlers using onMouseDown to prevent blur race
      const handleSave = (e: React.MouseEvent) => {
        e.preventDefault() // prevent input blur
        e.stopPropagation()
        saveCell(scenario.id, colKey, editValue)
      }
      const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        cancelEditing()
      }

      // Company select: native <select> dropdown with existing companies + "Add new" option
      if (editType === 'company-select') {
        const existingCompanies = Array.from(new Set(
          scenarios.map((s: any) => s.client?.company).filter(Boolean) as string[]
        )).sort()

        const selectedInDropdown = existingCompanies.includes(editValue) ? editValue : ''

        // When user picks from dropdown
        const handleSelectChange = (val: string) => {
          if (val === '__ADD_NEW__') {
            setCompanyMode('input')
            setNewCompanyName('')
            // Focus the text input after render
            setTimeout(() => editInputRef.current?.focus(), 0)
          } else {
            setEditValue(val)
          }
        }

        // When user types a new company name
        const handleNewCompanyConfirm = () => {
          if (newCompanyName.trim()) {
            saveCell(scenario.id, colKey, newCompanyName.trim())
          } else {
            cancelEditing()
          }
        }

        // SELECT MODE: native dropdown
        if (companyMode === 'select') {
          return (
            <TableCell onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <select
                  ref={editInputRef as any}
                  value={selectedInDropdown}
                  onChange={e => handleSelectChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (editValue) saveCell(scenario.id, colKey, editValue)
                    }
                    if (e.key === 'Escape') cancelEditing()
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      handleTabNav(scenario.id, colKey, e.shiftKey)
                    }
                  }}
                  className="h-7 text-xs border border-vivid-blue rounded px-1 bg-white focus:outline-none focus:ring-1 focus:ring-vivid-blue flex-1 cursor-pointer"
                  autoFocus
                >
                  <option value="" disabled>Select a company...</option>
                  {existingCompanies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Add New Company</option>
                </select>
                <button
                  className="flex items-center justify-center h-7 w-7 rounded hover:bg-emerald/10 text-emerald cursor-pointer shrink-0 border border-transparent hover:border-emerald/20 transition-colors"
                  onMouseDown={handleSave}
                  title="Save (Enter)"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  className="flex items-center justify-center h-7 w-7 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer shrink-0 border border-transparent hover:border-red-200 transition-colors"
                  onMouseDown={handleCancel}
                  title="Cancel (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </TableCell>
          )
        }

        // INPUT MODE: type a new company name
        return (
          <TableCell onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <Input
                ref={editInputRef}
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleNewCompanyConfirm()
                  }
                  if (e.key === 'Escape') cancelEditing()
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    handleTabNav(scenario.id, colKey, e.shiftKey)
                  }
                }}
                className="h-7 text-xs border-vivid-blue focus:ring-1 focus:ring-vivid-blue flex-1"
                autoFocus
                placeholder="Type new company name..."
              />
              <button
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-muted text-muted-foreground cursor-pointer shrink-0 border border-transparent hover:border-muted-foreground/20 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCompanyMode('select')
                }}
                title="Back to list"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-emerald/10 text-emerald cursor-pointer shrink-0 border border-transparent hover:border-emerald/20 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleNewCompanyConfirm()
                }}
                title="Save (Enter)"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer shrink-0 border border-transparent hover:border-red-200 transition-colors"
                onMouseDown={handleCancel}
                title="Cancel (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </TableCell>
        )
      }

      // Status select
      if (editType === 'select' && colKey === 'status') {
        return (
          <TableCell onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <select
                ref={editInputRef as any}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    saveCell(scenario.id, colKey, editValue)
                  }
                  if (e.key === 'Escape') cancelEditing()
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    handleTabNav(scenario.id, colKey, e.shiftKey)
                  }
                }}
                className="h-7 text-xs border border-vivid-blue rounded px-1 bg-white focus:outline-none focus:ring-1 focus:ring-vivid-blue"
                autoFocus
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
              <button
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-emerald/10 text-emerald cursor-pointer shrink-0 border border-transparent hover:border-emerald/20 transition-colors"
                onMouseDown={handleSave}
                title="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer shrink-0 border border-transparent hover:border-red-200 transition-colors"
                onMouseDown={handleCancel}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </TableCell>
        )
      }

      // Text input (name, website, overview)
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Input
              ref={editInputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveCell(scenario.id, colKey, editValue)
                }
                if (e.key === 'Escape') cancelEditing()
                if (e.key === 'Tab') {
                  e.preventDefault()
                  handleTabNav(scenario.id, colKey, e.shiftKey)
                }
              }}
              className="h-7 text-xs border-vivid-blue focus:ring-1 focus:ring-vivid-blue"
              autoFocus
            />
            <button
              className="flex items-center justify-center h-7 w-7 rounded hover:bg-emerald/10 text-emerald cursor-pointer shrink-0 border border-transparent hover:border-emerald/20 transition-colors"
              onMouseDown={handleSave}
              title="Save (Enter)"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              className="flex items-center justify-center h-7 w-7 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer shrink-0 border border-transparent hover:border-red-200 transition-colors"
              onMouseDown={handleCancel}
              title="Cancel (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </TableCell>
      )
    }

    // Non-editing mode: single click to edit, hover shows highlight
    const interactive = isInteractiveCell(colKey)
    return (
      <TableCell
        className={`relative group ${interactive ? 'cursor-text' : ''}`}
        onClick={(e) => {
          e.stopPropagation() // Always stop — never let row click open scenario
          if (editable) startEditing(scenario.id, colKey, scenario)
        }}
      >
        <div className="flex items-center gap-1">
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin text-vivid-blue" />
          ) : null}
          <span className={interactive ? 'group-hover:ring-1 group-hover:ring-vivid-blue/30 group-hover:bg-vivid-blue/5 group-hover:rounded group-hover:px-0.5 transition-all' : ''}>
            {children}
          </span>
        </div>
      </TableCell>
    )
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

  // =====================
  // DETAIL VIEW
  // =====================
  if (viewMode === 'detail' && currentScenario) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={backToTable}>
            ← {t('dashboard.backToTable')}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-64 justify-start">
                {currentScenario.name}
                <Badge
                  variant={currentScenario.status === 'submitted' ? 'default' : 'secondary'}
                  className={`text-[9px] px-1 py-0 ml-2 ${currentScenario.status === 'submitted' ? 'bg-emerald text-white' : ''}`}
                >
                  {currentScenario.status === 'submitted' ? t('dashboard.submitted') : t('dashboard.draft')}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1 max-h-60 overflow-y-auto">
              {scenarios.map((s: any) => (
                <button
                  key={s.id}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                    s.id === currentScenario.id ? 'bg-vivid-blue/10 text-vivid-blue' : 'hover:bg-muted'
                  }`}
                  onClick={() => { setActiveScenarioId(s.id); setActiveTab('form') }}
                >
                  <span className="truncate">{s.name}</span>
                  <Badge
                    variant={s.status === 'submitted' ? 'default' : 'secondary'}
                    className={`text-[9px] px-1 py-0 ml-auto shrink-0 ${s.status === 'submitted' ? 'bg-emerald text-white' : ''}`}
                  >
                    {s.status === 'submitted' ? t('dashboard.submitted') : t('dashboard.draft')}
                  </Badge>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="sm" onClick={async () => {
              const newName = prompt('New name:', currentScenario.name)
              if (newName && newName.trim()) {
                await fetch(`/api/scenarios/${currentScenario.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newName.trim() }),
                })
                queryClient.invalidateQueries({ queryKey: ['scenarios'] })
                toast.success('Renamed')
              }
            }} title="Rename">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDeleteScenario(currentScenario.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
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
      </div>
    )
  }

  // =====================
  // TABLE VIEW (default)
  // =====================

  return (
    <div className="space-y-3">
      {/* Table styles - fixed layout so columns fit viewport */}
      <style>{`
        .mp-fit-table { table-layout: fixed; width: 100%; }
        .mp-fit-table td, .mp-fit-table th { overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; }
      `}</style>

      {/* Toolbar: Search, Undo/Redo, Add */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('general.search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 border rounded-md p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={undoStack.length === 0 || isUndoing}
                onClick={handleUndo}
                title="Undo (last field edit)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={redoStack.length === 0 || isUndoing}
                onClick={handleRedo}
                title="Redo"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
              {(undoStack.length > 0 || redoStack.length > 0) && (
                <span className="text-[10px] text-muted-foreground px-1">
                  {undoStack.length > 0 ? `${undoStack.length}` : '0'}
                </span>
              )}
            </div>

            {/* Selected count + bulk actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedIds.size} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7"
                  onClick={async () => {
                    if (!confirm(`Delete ${selectedIds.size} scenario(s)?`)) return
                    for (const id of selectedIds) {
                      await fetch(`/api/scenarios/${id}`, { method: 'DELETE' })
                    }
                    toast.success(`${selectedIds.size} scenario(s) deleted`)
                    setSelectedIds(new Set())
                    queryClient.invalidateQueries({ queryKey: ['scenarios'] })
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Clear all column filters */}
            {anyColumnFilterActive && (
              <Button variant="ghost" size="sm" onClick={clearAllColumnFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}

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
        </CardContent>
      </Card>

      {/* Scenario count + hints */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredScenarios.length} of {scenarios.length} {t('dashboard.scenarios')}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-vivid-blue">({selectedIds.size} selected)</span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Click to edit · <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] border">Tab</kbd> next field · <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] border">Enter</kbd> save
          </p>
        </div>
      </div>

      {/* Table - all columns fit within viewport, no horizontal scroll */}
      {filteredScenarios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('general.noData')}</p>
        </div>
      ) : (
        <div
          ref={tableContainerRef}
          className="overflow-y-auto overflow-x-hidden border rounded-lg"
          style={{ maxHeight: 'calc(100vh - 260px)' }}
        >
            <Table className="mp-fit-table">
              <TableHeader>
                <TableRow className="bg-muted/50 sticky top-0 z-10">
                  <TableHead className="w-[36px] px-1">
                    <Checkbox
                      checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>

                  <FilterableHeader colKey="name" sortFieldKey="name" label={t('dashboard.colName')} className="w-[20%]" />
                  <FilterableHeader colKey="status" sortFieldKey="status" label={t('dashboard.colStatus')} className="w-[8%]" />
                  <FilterableHeader colKey="company" sortFieldKey="company" label={t('dashboard.colCompany')} className="w-[16%]" />
                  <FilterableHeader colKey="website" sortFieldKey="website" label={t('dashboard.colWebsite')} className="w-[16%]" />
                  <FilterableHeader colKey="overview" sortFieldKey="overview" label={t('dashboard.colOverview')} className="w-[22%]" />
                  <FilterableHeader colKey="updatedAt" sortFieldKey="updatedAt" label={t('dashboard.colUpdated')} className="w-[8%]" />
                  <FilterableHeader colKey="createdAt" sortFieldKey="createdAt" label={t('dashboard.colCreated')} className="w-[8%]" />
                  <TableHead className="text-right w-[6%]">{t('dashboard.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenarios.map((scenario: any) => {
                  const isRowEditing = editingCell?.scenarioId === scenario.id

                  return (
                    <TableRow
                      key={scenario.id}
                      className={`transition-colors ${
                        isRowEditing
                          ? 'bg-vivid-blue/5'
                          : selectedIds.has(scenario.id)
                            ? 'bg-vivid-blue/8 hover:bg-vivid-blue/12'
                            : 'hover:bg-vivid-blue/5'
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-2" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(scenario.id)}
                          onCheckedChange={() => toggleSelectRow(scenario.id)}
                          aria-label={`Select ${scenario.name}`}
                        />
                      </TableCell>

                      {/* Name - editable */}
                      <EditableCell scenario={scenario} colKey="name">
                        <span className="font-medium text-sm break-words">{scenario.name}</span>
                      </EditableCell>

                      {/* Status - editable (select) */}
                      <EditableCell scenario={scenario} colKey="status">
                        <Badge
                          variant={scenario.status === 'submitted' ? 'default' : 'secondary'}
                          className={`text-xs ${scenario.status === 'submitted' ? 'bg-emerald text-white' : ''}`}
                        >
                          {scenario.status === 'submitted' ? t('dashboard.submitted') : t('dashboard.draft')}
                        </Badge>
                      </EditableCell>

                      {/* Company - editable (company select with existing + add new) */}
                      <EditableCell scenario={scenario} colKey="company">
                        <span className="text-sm text-muted-foreground break-words">
                          {scenario.client?.company || scenario.client?.name || '—'}
                        </span>
                      </EditableCell>

                      {/* Website - editable */}
                      <EditableCell scenario={scenario} colKey="website">
                        <span className="text-xs text-muted-foreground break-all">
                          {scenario.companyWebsiteUrl ? scenario.companyWebsiteUrl.replace(/^https?:\/\//, '') : '—'}
                        </span>
                      </EditableCell>

                      {/* Overview - editable */}
                      <EditableCell scenario={scenario} colKey="overview">
                        <span className="text-xs text-muted-foreground break-words">
                          {scenario.overview || '—'}
                        </span>
                      </EditableCell>

                      {/* Updated - visual hover for admin, stops propagation */}
                      <TableCell
                        className={`relative group ${isAdmin ? 'cursor-default' : ''}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <span className={`text-xs text-muted-foreground ${isAdmin ? 'group-hover:ring-1 group-hover:ring-vivid-blue/20 group-hover:bg-vivid-blue/5 group-hover:rounded group-hover:px-0.5 transition-all' : ''}`}>
                          {new Date(scenario.updatedAt).toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* Created - visual hover for admin, stops propagation */}
                      <TableCell
                        className={`relative group ${isAdmin ? 'cursor-default' : ''}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <span className={`text-xs text-muted-foreground ${isAdmin ? 'group-hover:ring-1 group-hover:ring-vivid-blue/20 group-hover:bg-vivid-blue/5 group-hover:rounded group-hover:px-0.5 transition-all' : ''}`}>
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openScenarioDetail(scenario)}
                            title={t('dashboard.openDetail')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(scenario.id, 'name', scenario)}
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteScenario(scenario.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
      )}
    </div>
  )
}
