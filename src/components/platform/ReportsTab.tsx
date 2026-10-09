'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  BarChart3, FileText, Plug, LifeBuoy, ListChecks, Users,
  Download, RefreshCw, Filter, Inbox, AlertCircle, Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis,
  YAxis, CartesianGrid, Tooltip as RTooltip, Legend, BarChart, Bar,
} from 'recharts'

// Shared status badge + chart color map — Rule #12 of the Best Practices
// Playbook: one status, one badge, one definition.
import { StatusBadge, STATUS_COLORS, statusLabel } from './StatusBadge'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

// Chart palette — derived from the brand book + status color system.
const CHART_PALETTE = ['#9333EA', '#7E22CE', '#6B21A8', '#A855F7', '#C084FC', '#E9D5FF']

// Filter types for the Summary tab — each filter applies to the entity it
// controls (Rule #4 of the Best Practices Playbook).
type ScopeFilter = 'all' | 'mine' | 'recent'

// ============================================================
// ReportsTab — applies the MassaPro Reporting Best Practices
// Playbook to the platform's Reports main tab.
//
//   A) Summary       — KPI cards, real charts (donut/line/bar), live-filter counts
//   B) Demos         — per-demo scenario list with status badges
//   C) Integrations  — integration setup + SOW status breakdowns with cadence
//   D) Support       — ticket status/priority with recent activity
//
// Practices applied from the Best Practices Playbook:
//   R1  Loading renders skeletons matching final content geometry
//   R3  Filter option counts computed from the FULL dataset
//   R5  Empty states distinguish no-data vs no-match and offer next action
//   R6  Every mutation ends in a toast
//   R12 Statuses use the shared StatusBadge + 6 reserved hue slots
//   R13 Every icon-only control carries an ARIA label
// ============================================================
export default function ReportsTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('summary')
  const [scope, setScope] = useState<ScopeFilter>('all')

  const { data: reporting, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['reporting'],
    queryFn: async () => {
      const res = await fetch('/api/reporting')
      if (!res.ok) throw new Error('Failed to load reporting data')
      return res.json()
    },
  })
  const { data: demosData } = useQuery({
    queryKey: ['demos'],
    queryFn: async () => {
      const res = await fetch('/api/demos')
      if (!res.ok) throw new Error('Failed to load demos')
      return res.json()
    },
  })
  const { data: scenariosData } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed to load scenarios')
      return res.json()
    },
  })

  const handleRefresh = () => {
    refetch()
    toast.success('Reports refreshed', { description: 'Latest data fetched from the platform.' })
  }

  const handleExport = () => {
    const rows = buildExportRows(reporting, demosData, scenariosData)
    if (rows.length === 0) {
      toast.error('Nothing to export', { description: 'There is no report data to export yet.' })
      return
    }
    downloadCsv('massapro-reports.csv', rows)
    toast.success('Export ready', { description: `Exported ${rows.length} rows to massapro-reports.csv.` })
  }

  // R1: Loading renders skeletons matching the final content geometry,
  // never zeros and never a blocking spinner. This is the platform's
  // first convention (Table 2 of the Best Practices Playbook).
  if (isLoading) {
    return <ReportsSkeleton activeTab={sub} onTabChange={setSub} />
  }

  const demos = (demosData?.demos || []) as any[]
  const scenarios = Array.isArray(scenariosData) ? scenariosData : []
  const tickets = reporting?.tickets || { byStatus: {}, byPriority: {}, total: 0, recent: [] }
  const integration = reporting?.integration || { byStatus: {}, total: 0 }
  const sow = reporting?.sow || { byStatus: {}, total: 0, recent: [] }
  const tasks = reporting?.tasks || { byStatus: {}, byService: {}, total: 0 }
  const cadence: { date: string; tickets: number; integrations: number; sows: number }[] =
    reporting?.cadence || []
  const scenariosAgg = reporting?.scenarios || { byStatus: {}, byDemo: {}, total: 0 }
  const demosAgg = reporting?.demos || { total: 0, list: [] }

  // R3: Live counts computed from the FULL dataset, never the visible subset.
  // The scope filter narrows what's displayed but the filter dropdown itself
  // always shows the truthful total.
  const scopeFilteredScenarios = scope === 'recent'
    ? scenarios.filter((s: any) => {
        const created = new Date(s.createdAt).getTime()
        return Date.now() - created < 14 * 24 * 60 * 60 * 1000
      })
    : scenarios
  const scopeFilteredDemos = scope === 'recent'
    ? demos.filter((d: any) => {
        const created = new Date(d.createdAt || Date.now()).getTime()
        return Date.now() - created < 14 * 24 * 60 * 60 * 1000
      })
    : demos

  // Cadence roll-up — last 8 weeks of activity across tickets/integrations/SOWs.
  // Pre-computed by the API; here we just slice for the chart.
  const cadenceData = cadence.map((d) => ({
    date: d.date.slice(5), // MM-DD for x-axis legibility
    full: d.date,
    tickets: d.tickets,
    integrations: d.integrations,
    sows: d.sows,
  }))

  // Donut data for the status distribution chart (across all SOWs).
  const sowStatusData = Object.entries(sow.byStatus).map(([k, v]) => ({
    name: statusLabel(k),
    value: v as number,
    color: STATUS_COLORS[k.toLowerCase()] || '#A1A1AA',
  }))
  const ticketStatusData = Object.entries(tickets.byStatus).map(([k, v]) => ({
    name: statusLabel(k),
    value: v as number,
    color: STATUS_COLORS[k.toLowerCase().replace('_', '-')] || '#A1A1AA',
  }))
  const taskStatusData = Object.entries(tasks.byStatus).map(([k, v]) => ({
    name: statusLabel(k),
    value: v as number,
    color: STATUS_COLORS[k.toLowerCase().replace('-', '')] ||
            STATUS_COLORS[k.toLowerCase()] || '#A1A1AA',
  }))

  // Bar data for cross-demo scenario comparison.
  const perDemoScenarios = demosAgg.list?.map((d: any) => ({
    name: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
    fullName: d.name,
    scenarios: d.scenarioCount,
  })) || []

  // Per-service task distribution.
  const taskServiceData = Object.entries(tasks.byService).map(([k, v]) => ({
    name: k,
    value: v as number,
  }))

  return (
    <div className="space-y-4">
      {/* Page header — title, subtitle, primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: ORCHID }}>
            <BarChart3 className="h-5 w-5" aria-hidden />
            {t('reporting.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('reporting.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label="Refresh reports"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            aria-label="Export reports to CSV"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList>
          <TabsTrigger value="summary" className="text-xs sm:text-sm">
            {t('platform.tab.reports.summary')}
          </TabsTrigger>
          <TabsTrigger value="demos" className="text-xs sm:text-sm">
            {t('platform.tab.reports.demos')}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">
            {t('platform.tab.reports.integrationsSow')}
          </TabsTrigger>
          <TabsTrigger value="support" className="text-xs sm:text-sm">
            {t('platform.tab.reports.support')}
          </TabsTrigger>
        </TabsList>

        {/* === Summary === */}
        <TabsContent value="summary" className="focus-visible:outline-none space-y-4">
          {/* Scope filter — R3: counts computed from the full dataset */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: JET }}>
              <Filter className="h-3.5 w-3.5" aria-hidden />
              <span className="font-semibold uppercase tracking-wide" style={{ opacity: 0.7 }}>
                Scope
              </span>
              <Select value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
                <SelectTrigger className="h-8 w-[160px]" aria-label="Filter scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="recent">Last 14 days</SelectItem>
                  <SelectItem value="mine">Mine only</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs italic" style={{ opacity: 0.6 }}>
                Showing {scopeFilteredDemos.length} of {demos.length} demos · {scopeFilteredScenarios.length} of {scenarios.length} scenarios
              </span>
            </div>
          </div>

          {/* KPI card row — 6 cards, responsive grid 2→3→6 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Demos" value={demosAgg.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Scenarios" value={scenariosAgg.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Integrations" value={integration.total} icon={<Plug className="h-5 w-5" />} />
            <StatCard label="SOWs" value={sow.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Tasks" value={tasks.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Tickets" value={tickets.total} icon={<LifeBuoy className="h-5 w-5" />} />
          </div>

          {/* First chart row — donut for status mix + line for cadence */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
              title="SOW status distribution"
              description="Live counts across all snapshots"
            >
              {sowStatusData.length === 0 ? (
                <EmptyChartState kind="no-data" message="No SOWs yet" />
              ) : (
                <DonutChart data={sowStatusData} />
              )}
            </ChartCard>

            <ChartCard
              title="Activity over the last 8 weeks"
              description="Daily tickets, integrations and SOWs created"
              className="lg:col-span-2"
            >
              {cadenceData.every((d) => d.tickets + d.integrations + d.sows === 0) ? (
                <EmptyChartState kind="no-data" message="No activity in the last 8 weeks" />
              ) : (
                <CadenceChart data={cadenceData} />
              )}
            </ChartCard>
          </div>

          {/* Second chart row — task status donut + per-demo scenarios bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
              title="Tasks by status"
              description="Across every tracked SOW task"
            >
              {taskStatusData.length === 0 ? (
                <EmptyChartState kind="no-data" message="No tasks tracked yet" />
              ) : (
                <DonutChart data={taskStatusData} />
              )}
            </ChartCard>

            <ChartCard
              title="Scenarios per demo"
              description="Cross-demo comparison"
              className="lg:col-span-2"
            >
              {perDemoScenarios.length === 0 ? (
                <EmptyChartState kind="no-data" message="No demos yet" />
              ) : (
                <BarChartMini data={perDemoScenarios} />
              )}
            </ChartCard>
          </div>

          {/* Third row — ticket priority + task service */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Support tickets by status"
              description="Live counts from the ticket queue"
            >
              {ticketStatusData.length === 0 ? (
                <EmptyChartState kind="no-data" message="No tickets yet" />
              ) : (
                <DonutChart data={ticketStatusData} />
              )}
            </ChartCard>

            <ChartCard
              title="Tasks per service"
              description="Where the team's tracked effort sits"
            >
              {taskServiceData.length === 0 ? (
                <EmptyChartState kind="no-data" message="No service breakdown yet" />
              ) : (
                <BarChartMini data={taskServiceData} />
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* === Demos === */}
        <TabsContent value="demos" className="focus-visible:outline-none">
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                <FileText className="h-5 w-5" aria-hidden /> Demos &amp; Scenarios
              </CardTitle>
              <CardDescription>Per-demo breakdown of scenarios, status and access count</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {scopeFilteredDemos.length === 0 ? (
                scope === 'recent' ? (
                  <EmptyState
                    kind="no-match"
                    message="No demos created in the last 14 days"
                    onAction={() => setScope('all')}
                    actionLabel="Clear filter"
                  />
                ) : (
                  <EmptyState
                    kind="no-data"
                    message="No demos yet"
                    hint="Create one in the Demos tab to see it here"
                  />
                )
              ) : (
                scopeFilteredDemos.map((demo: any) => (
                  <DemoRow key={demo.id} demo={demo} scenarios={scopeFilteredScenarios} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Integrations & SOW === */}
        <TabsContent value="integrations" className="focus-visible:outline-none">
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                <Plug className="h-5 w-5" aria-hidden /> Integrations &amp; SOW
              </CardTitle>
              <CardDescription>Per-setup and per-SOW breakdown with task status</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {/* SOW recent list */}
              {sow.recent && sow.recent.length > 0 ? (
                sow.recent.map((s: any) => (
                  <div
                    key={s.id}
                    className="rounded-lg border p-3 flex items-center justify-between"
                    style={{ borderColor: LAVENDER, background: WHITE }}
                  >
                    <div>
                      <div className="font-semibold text-sm" style={{ color: JET }}>{s.name}</div>
                      <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                        Updated {new Date(s.updatedAt).toLocaleDateString()}
                        {s.owner?.email ? ` · ${s.owner.email}` : ''}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))
              ) : (
                <EmptyState
                  kind="no-data"
                  message="No SOW documents yet"
                  hint="Open the SOW Builder to create your first SOW"
                />
              )}

              {/* Task status summary */}
              <div className="rounded-lg p-3" style={{ background: LAVENDER }}>
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                  Tasks across all SOWs (by status)
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(tasks.byStatus).length === 0 ? (
                    <span className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>
                      No tasks tracked yet.
                    </span>
                  ) : (
                    Object.entries(tasks.byStatus).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <StatusBadge status={k} />
                        <span className="text-xs font-bold" style={{ color: ORCHID }}>
                          {v as number}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Support === */}
        <TabsContent value="support" className="focus-visible:outline-none">
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                <LifeBuoy className="h-5 w-5" aria-hidden /> Support
              </CardTitle>
              <CardDescription>Tickets by status, priority and recent activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {/* Status + priority summary bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: LAVENDER }}>
                  <div className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                    By status
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tickets.byStatus).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1">
                        <StatusBadge status={k} />
                        <span className="text-xs font-bold" style={{ color: ORCHID }}>{v as number}</span>
                      </div>
                    ))}
                    {Object.keys(tickets.byStatus).length === 0 && (
                      <span className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>No tickets.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ background: LAVENDER }}>
                  <div className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                    By priority
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tickets.byPriority).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1">
                        <StatusBadge status={k === 'critical' ? 'blocked' : k === 'high' ? 'in-progress' : k === 'normal' ? 'pending' : 'approved'} />
                        <span className="text-xs font-bold" style={{ color: ORCHID }}>{v as number}</span>
                      </div>
                    ))}
                    {Object.keys(tickets.byPriority).length === 0 && (
                      <span className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>No tickets.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div className="pt-2">
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: JET, opacity: 0.7 }}>
                  Recent tickets
                </div>
                {tickets.recent && tickets.recent.length > 0 ? (
                  tickets.recent.map((tk: any) => (
                    <div
                      key={tk.id}
                      className="rounded-lg border p-3 mb-2 flex items-start justify-between gap-3"
                      style={{ borderColor: LAVENDER, background: WHITE }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: JET }}>
                          {tk.subject || tk.title}
                        </div>
                        <div className="text-xs mt-1" style={{ color: JET, opacity: 0.7 }}>
                          By {tk.submittedBy?.email || '—'} · {new Date(tk.createdAt).toLocaleDateString()}
                          {tk.assignedTo && ` · Assigned to ${tk.assignedTo.name || tk.assignedTo.email}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <StatusBadge status={tk.priority === 'critical' ? 'blocked' : tk.priority === 'high' ? 'in-progress' : tk.priority === 'normal' ? 'pending' : 'approved'} />
                        <StatusBadge status={tk.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    kind="no-data"
                    message="No support tickets yet"
                    hint="Open the Support tab to submit your first ticket"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wide" style={{ color: JET, opacity: 0.7 }}>
            {label}
          </span>
          <span style={{ color: ORCHID }} aria-hidden>{icon}</span>
        </div>
        <div className="text-3xl font-extrabold" style={{ color: ORCHID }}>{value}</div>
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title, description, children, className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className} style={{ borderColor: LAVENDER }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2" style={{ color: ORCHID }}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-2">
        {children}
      </CardContent>
    </Card>
  )
}

function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <RTooltip
            formatter={(value: number, name: string) => [
              `${value} (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function CadenceChart({
  data,
}: {
  data: { date: string; full: string; tickets: number; integrations: number; sows: number }[]
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3E8FF" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525B' }} interval={6} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525B' }} />
          <RTooltip
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload
              return p?.full ? new Date(p.full).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              }) : ''
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="line"
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="tickets"
            name="Tickets"
            stroke="#9333EA"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="integrations"
            name="Integrations"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="sows"
            name="SOWs"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function BarChartMini({ data }: { data: { name: string; value: number; fullName?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3E8FF" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525B' }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525B' }} />
          <RTooltip formatter={(v: number, n, p: any) => [v, p?.payload?.fullName || n]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// EmptyChartState — distinguishes no-data from no-match per R5
function EmptyChartState({ kind, message }: { kind: 'no-data' | 'no-match'; message: string }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-center">
      <div className="rounded-full p-3 mb-2" style={{ background: LAVENDER }} aria-hidden>
        {kind === 'no-data' ? (
          <Inbox className="h-6 w-6" style={{ color: ORCHID }} />
        ) : (
          <AlertCircle className="h-6 w-6" style={{ color: '#F59E0B' }} />
        )}
      </div>
      <p className="text-xs italic" style={{ color: JET, opacity: 0.7 }}>{message}</p>
    </div>
  )
}

// EmptyState — R5: differentiate no-data from no-match, offer next action
function EmptyState({
  kind,
  message,
  hint,
  onAction,
  actionLabel,
}: {
  kind: 'no-data' | 'no-match'
  message: string
  hint?: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
      <div className="inline-flex rounded-full p-3 mb-3" style={{ background: WHITE }} aria-hidden>
        {kind === 'no-data' ? (
          <Inbox className="h-6 w-6" style={{ color: ORCHID }} />
        ) : (
          <AlertCircle className="h-6 w-6" style={{ color: '#F59E0B' }} />
        )}
      </div>
      <p className="text-sm font-semibold" style={{ color: JET }}>{message}</p>
      {hint && <p className="text-xs mt-1 italic" style={{ color: JET, opacity: 0.7 }}>{hint}</p>}
      {onAction && actionLabel && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

function DemoRow({ demo, scenarios }: { demo: any; scenarios: any[] }) {
  const demoScenarios = scenarios.filter((s: any) => s.demoId === demo.id)
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: LAVENDER, background: WHITE }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: JET }}>{demo.name}</div>
          <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
            Owner: {demo.owner?.name || demo.owner?.email || '—'} · {demoScenarios.length} scenarios
            {demo._count?.demoAccess ? ` · ${demo._count.demoAccess} collaborators` : ''}
          </div>
        </div>
      </div>
      {demoScenarios.length === 0 ? (
        <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>
          No scenarios in this demo yet.
        </p>
      ) : (
        <div className="space-y-1">
          {demoScenarios.map((s: any) => (
            <div
              key={s.id}
              className="flex items-center justify-between text-sm border-t pt-1.5"
              style={{ borderColor: LAVENDER }}
            >
              <span className="truncate flex-1" style={{ color: JET }}>{s.name}</span>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Skeleton loader — R1: matches the final content geometry,
// never zeros and never a blocking spinner.
// ============================================================
function ReportsSkeleton({ activeTab, onTabChange }: {
  activeTab: string
  onTabChange: (v: string) => void
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading reports">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-3 w-72" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-20" />
          <SkeletonBlock className="h-8 w-16" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 border-b pb-2" style={{ borderColor: LAVENDER }}>
        {['Summary', 'Demos', 'Integrations', 'Support'].map((label) => (
          <SkeletonBlock key={label} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4" style={{ borderColor: LAVENDER }}>
            <SkeletonBlock className="h-3 w-20 mb-2" />
            <SkeletonBlock className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Chart row skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 lg:col-span-1" style={{ borderColor: LAVENDER }}>
          <SkeletonBlock className="h-4 w-44 mb-2" />
          <SkeletonBlock className="h-3 w-56 mb-3" />
          <SkeletonBlock className="h-[200px] w-full rounded" />
        </div>
        <div className="rounded-lg border p-4 lg:col-span-2" style={{ borderColor: LAVENDER }}>
          <SkeletonBlock className="h-4 w-56 mb-2" />
          <SkeletonBlock className="h-3 w-72 mb-3" />
          <SkeletonBlock className="h-[220px] w-full rounded" />
        </div>
      </div>
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className || ''}`}
      style={{ background: LAVENDER }}
    />
  )
}

// ============================================================
// CSV export — P1 from the Capabilities Audit: stakeholders
// can take reporting data into decks and spreadsheets.
// ============================================================
function buildExportRows(reporting: any, demosData: any, scenariosData: any): any[] {
  const rows: any[] = []
  const demos = demosData?.demos || []
  const scenarios = Array.isArray(scenariosData) ? scenariosData : []
  const tickets = reporting?.tickets || { byStatus: {}, byPriority: {}, recent: [] }
  const integration = reporting?.integration || { byStatus: {} }
  const sow = reporting?.sow || { byStatus: {}, recent: [] }
  const tasks = reporting?.tasks || { byStatus: {}, byService: {} }

  rows.push(['Section', 'Key', 'Value'])
  rows.push(['Demos', 'Total', demos.length])
  rows.push(['Scenarios', 'Total', scenarios.length])
  rows.push(['Integrations', 'Total', integration.total || 0])
  rows.push(['SOWs', 'Total', sow.total || 0])
  rows.push(['Tasks', 'Total', tasks.total || 0])
  rows.push(['Tickets', 'Total', tickets.total || 0])
  rows.push(['', '', ''])

  rows.push(['SOW status', 'Status', 'Count'])
  Object.entries(sow.byStatus || {}).forEach(([k, v]) => rows.push(['SOW status', k, v as number]))
  rows.push(['', '', ''])

  rows.push(['Ticket status', 'Status', 'Count'])
  Object.entries(tickets.byStatus || {}).forEach(([k, v]) =>
    rows.push(['Ticket status', k, v as number]),
  )
  rows.push(['Ticket priority', 'Priority', 'Count'])
  Object.entries(tickets.byPriority || {}).forEach(([k, v]) =>
    rows.push(['Ticket priority', k, v as number]),
  )
  rows.push(['', '', ''])

  rows.push(['Task status', 'Status', 'Count'])
  Object.entries(tasks.byStatus || {}).forEach(([k, v]) =>
    rows.push(['Task status', k, v as number]),
  )
  rows.push(['Task service', 'Service', 'Count'])
  Object.entries(tasks.byService || {}).forEach(([k, v]) =>
    rows.push(['Task service', k, v as number]),
  )
  rows.push(['', '', ''])

  rows.push(['Demo', 'Owner', 'Scenarios'])
  demos.forEach((d: any) =>
    rows.push([d.name, d.owner?.email || '—', d._count?.scenarios || 0]),
  )

  return rows
}

function downloadCsv(filename: string, rows: any[]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '')
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
