'use client'

import { useState } from 'react'
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
import {
  BarChart3, FileText, Plug, LifeBuoy, ListChecks, Filter, Users,
} from 'lucide-react'

// Shared report primitives — see report-primitives.tsx for the full
// library of charts, KPIs, empty states, CSV export, etc.
import {
  StatCard, ChartCard, DonutChart, CadenceChart, BarChartMini,
  EmptyChartState, EmptyState, ErrorState, ReportHeader,
  SkeletonBlock, downloadCsv, exportCsvToast,
  ORCHID, JET, LAVENDER, WHITE, CHART_PALETTE,
} from './report-primitives'
import { StatusBadge, STATUS_COLORS, statusLabel } from './StatusBadge'

type ScopeFilter = 'all' | 'mine' | 'recent'

// ============================================================
// ReportsTab — applies the MassaPro Reporting Best Practices
// Playbook to the platform's Reports main tab.
//
//   A) Summary       — KPI cards + charts (donut/line/bar) for all entities
//   B) Demos         — full report: KPIs + charts + per-demo list + CSV
//   C) Integrations  — full report: KPIs + charts + per-SOW list + CSV
//   D) Support       — full report: KPIs + charts + per-ticket list + CSV
//
// Every sub-tab is now a full report (per user request: "all tabs
// under reports should be reports, also apply the reporting style
// and capabilities to the tabs under report").
// ============================================================
export default function ReportsTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('summary')
  const [scope, setScope] = useState<ScopeFilter>('all')

  const { data: reporting, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['reporting'],
    queryFn: async () => {
      const res = await fetch('/api/reporting')
      if (!res.ok) throw new Error('Failed to load reporting data')
      return res.json()
    },
    retry: 1, // Don't retry forever — show the error state quickly
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

  // R1: Skeleton loaders — never a blocking spinner, never zeros.
  if (isLoading) {
    return <ReportsSkeleton activeTab={sub} onTabChange={setSub} />
  }

  // Error state — if the API returns a 500, show a clear error message
  // with a Retry button instead of silently rendering empty charts
  // (which previously looked like "empty reporting").
  if (isError) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: ORCHID }}>
            <BarChart3 className="h-5 w-5" aria-hidden />
            {t('reporting.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('reporting.subtitle')}</p>
        </div>
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
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

  // R3: Live counts computed from the FULL dataset
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

  // Cadence chart data — MM-DD for x-axis, full date for tooltip
  const cadenceData = cadence.map((d) => ({
    date: d.date.slice(5),
    full: d.date,
    tickets: d.tickets,
    integrations: d.integrations,
    sows: d.sows,
  }))

  // Donut data for the Summary tab
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
  const perDemoScenarios = demosAgg.list?.map((d: any) => ({
    name: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
    fullName: d.name,
    scenarios: d.scenarioCount,
  })) || []
  const taskServiceData = Object.entries(tasks.byService).map(([k, v]) => ({
    name: k,
    value: v as number,
  }))

  // === CSV exports for each sub-tab ===
  const handleSummaryExport = () => exportCsvToast(
    buildSummaryRows({ demos, scenarios, integration, sow, tasks, tickets, demosAgg, scenariosAgg }),
    'massapro-reports-summary.csv',
  )
  const handleDemosExport = () => exportCsvToast(
    buildDemosRows({ demos: scopeFilteredDemos, scenarios: scopeFilteredScenarios }),
    'massapro-reports-demos.csv',
  )
  const handleIntegrationsExport = () => exportCsvToast(
    buildIntegrationsRows({ integration, sow, tasks }),
    'massapro-reports-integrations.csv',
  )
  const handleSupportExport = () => exportCsvToast(
    buildSupportRows({ tickets }),
    'massapro-reports-support.csv',
  )

  return (
    <div className="space-y-4">
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

        {/* ================================================== */}
        {/* === Summary === */}
        {/* ================================================== */}
        <TabsContent value="summary" className="focus-visible:outline-none space-y-4">
          <ReportHeader
            title={t('reporting.title')}
            subtitle={t('reporting.subtitle')}
            onRefresh={handleRefresh}
            onExport={handleSummaryExport}
            isFetching={isFetching}
          />

          {/* Scope filter */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: JET }}>
              <Filter className="h-3.5 w-3.5" aria-hidden />
              <span className="font-semibold uppercase tracking-wide" style={{ opacity: 0.7 }}>Scope</span>
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

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Demos" value={demosAgg.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Scenarios" value={scenariosAgg.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Integrations" value={integration.total} icon={<Plug className="h-5 w-5" />} />
            <StatCard label="SOWs" value={sow.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Tasks" value={tasks.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Tickets" value={tickets.total} icon={<LifeBuoy className="h-5 w-5" />} />
          </div>

          {/* First chart row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="SOW status distribution" description="Live counts across all snapshots">
              {sowStatusData.length === 0 ? (
                <EmptyChartState message="No SOWs yet" />
              ) : (
                <DonutChart data={sowStatusData} />
              )}
            </ChartCard>
            <ChartCard title="Activity over the last 8 weeks" description="Daily tickets, integrations and SOWs created" className="lg:col-span-2">
              {cadenceData.every((d) => d.tickets + d.integrations + d.sows === 0) ? (
                <EmptyChartState message="No activity in the last 8 weeks" />
              ) : (
                <CadenceChart data={cadenceData} height={220} />
              )}
            </ChartCard>
          </div>

          {/* Second chart row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Tasks by status" description="Across every tracked SOW task">
              {taskStatusData.length === 0 ? (
                <EmptyChartState message="No tasks tracked yet" />
              ) : (
                <DonutChart data={taskStatusData} />
              )}
            </ChartCard>
            <ChartCard title="Scenarios per demo" description="Cross-demo comparison" className="lg:col-span-2">
              {perDemoScenarios.length === 0 ? (
                <EmptyChartState message="No demos yet" />
              ) : (
                <BarChartMini data={perDemoScenarios} />
              )}
            </ChartCard>
          </div>

          {/* Third row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Support tickets by status" description="Live counts from the ticket queue">
              {ticketStatusData.length === 0 ? (
                <EmptyChartState message="No tickets yet" />
              ) : (
                <DonutChart data={ticketStatusData} />
              )}
            </ChartCard>
            <ChartCard title="Tasks per service" description="Where the team's tracked effort sits">
              {taskServiceData.length === 0 ? (
                <EmptyChartState message="No service breakdown yet" />
              ) : (
                <BarChartMini data={taskServiceData} />
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* ================================================== */}
        {/* === Demos === */}
        {/* ================================================== */}
        <TabsContent value="demos" className="focus-visible:outline-none space-y-4">
          <ReportHeader
            title="Demos report"
            subtitle="Per-demo breakdown of scenarios, status and access count"
            onRefresh={handleRefresh}
            onExport={handleDemosExport}
            isFetching={isFetching}
          />

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Demos" value={demosAgg.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Scenarios" value={scenariosAgg.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Scenarios (Draft)" value={(scenariosAgg.byStatus as any)?.draft || 0} icon={<ListChecks className="h-5 w-5" />} color="#A1A1AA" />
            <StatCard label="Scenarios (Approved)" value={(scenariosAgg.byStatus as any)?.approved || 0} icon={<ListChecks className="h-5 w-5" />} color="#10B981" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Scenarios by status" description="Distribution across all demos">
              {Object.keys(scenariosAgg.byStatus || {}).length === 0 ? (
                <EmptyChartState message="No scenarios yet" />
              ) : (
                <DonutChart
                  data={Object.entries(scenariosAgg.byStatus).map(([k, v]) => ({
                    name: statusLabel(k),
                    value: v as number,
                    color: STATUS_COLORS[k.toLowerCase().replace(/[\s_-]+/g, '-')] || '#A1A1AA',
                  }))}
                />
              )}
            </ChartCard>
            <ChartCard title="Scenarios per demo" description="Cross-demo comparison">
              {perDemoScenarios.length === 0 ? (
                <EmptyChartState message="No demos yet" />
              ) : (
                <BarChartMini data={perDemoScenarios} />
              )}
            </ChartCard>
          </div>

          {/* Per-demo list */}
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                <FileText className="h-5 w-5" aria-hidden /> Demo breakdown
              </CardTitle>
              <CardDescription>Per-demo scenario list with status and access count</CardDescription>
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

        {/* ================================================== */}
        {/* === Integrations & SOW === */}
        {/* ================================================== */}
        <TabsContent value="integrations" className="focus-visible:outline-none space-y-4">
          <ReportHeader
            title="Integrations & SOW report"
            subtitle="Per-setup and per-SOW breakdown with task status"
            onRefresh={handleRefresh}
            onExport={handleIntegrationsExport}
            isFetching={isFetching}
          />

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Integrations" value={integration.total} icon={<Plug className="h-5 w-5" />} />
            <StatCard label="SOWs" value={sow.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Tasks" value={tasks.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Tasks (Completed)" value={(tasks.byStatus as any)?.completed || 0} icon={<ListChecks className="h-5 w-5" />} color="#10B981" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Integration setups by status">
              {Object.keys(integration.byStatus || {}).length === 0 ? (
                <EmptyChartState message="No integration setups yet" />
              ) : (
                <DonutChart
                  data={Object.entries(integration.byStatus).map(([k, v]) => ({
                    name: statusLabel(k),
                    value: v as number,
                    color: STATUS_COLORS[k.toLowerCase()] || '#A1A1AA',
                  }))}
                />
              )}
            </ChartCard>
            <ChartCard title="SOW status distribution">
              {sowStatusData.length === 0 ? (
                <EmptyChartState message="No SOWs yet" />
              ) : (
                <DonutChart data={sowStatusData} />
              )}
            </ChartCard>
            <ChartCard title="Tasks by status">
              {taskStatusData.length === 0 ? (
                <EmptyChartState message="No tasks tracked yet" />
              ) : (
                <DonutChart data={taskStatusData} />
              )}
            </ChartCard>
          </div>

          {/* Per-SOW list + task summary */}
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                <FileText className="h-5 w-5" aria-hidden /> SOW documents
              </CardTitle>
              <CardDescription>Recent SOW snapshots with task breakdown</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
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
                        <span className="text-xs font-bold" style={{ color: ORCHID }}>{v as number}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================== */}
        {/* === Support === */}
        {/* ================================================== */}
        <TabsContent value="support" className="focus-visible:outline-none space-y-4">
          <ReportHeader
            title="Support report"
            subtitle="Tickets by status, priority and recent activity"
            onRefresh={handleRefresh}
            onExport={handleSupportExport}
            isFetching={isFetching}
          />

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tickets" value={tickets.total} icon={<LifeBuoy className="h-5 w-5" />} />
            <StatCard label="Open" value={(tickets.byStatus as any)?.open || 0} icon={<LifeBuoy className="h-5 w-5" />} color="#A1A1AA" />
            <StatCard label="In Progress" value={(tickets.byStatus as any)?.in_progress || 0} icon={<LifeBuoy className="h-5 w-5" />} color="#F59E0B" />
            <StatCard label="Resolved" value={(tickets.byStatus as any)?.resolved || 0} icon={<LifeBuoy className="h-5 w-5" />} color="#10B981" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Tickets by status" description="Live counts from the ticket queue">
              {ticketStatusData.length === 0 ? (
                <EmptyChartState message="No tickets yet" />
              ) : (
                <DonutChart data={ticketStatusData} />
              )}
            </ChartCard>
            <ChartCard title="Tickets by priority" description="Distribution across all tickets">
              {Object.keys(tickets.byPriority || {}).length === 0 ? (
                <EmptyChartState message="No tickets yet" />
              ) : (
                <DonutChart
                  data={Object.entries(tickets.byPriority).map(([k, v]) => ({
                    name: k.charAt(0).toUpperCase() + k.slice(1),
                    value: v as number,
                    color: k === 'critical' ? '#EF4444' : k === 'high' ? '#F59E0B' : k === 'normal' ? '#3B82F6' : '#A1A1AA',
                  }))}
                />
              )}
            </ChartCard>
          </div>

          {/* Ticket list */}
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
                <LifeBuoy className="h-5 w-5" aria-hidden /> Recent tickets
              </CardTitle>
              <CardDescription>Latest tickets with status, priority, and assignee</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {tickets.recent && tickets.recent.length > 0 ? (
                tickets.recent.map((tk: any) => (
                  <div
                    key={tk.id}
                    className="rounded-lg border p-3 flex items-start justify-between gap-3"
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
                      <StatusBadge status={
                        tk.priority === 'critical' ? 'blocked' :
                        tk.priority === 'high' ? 'in-progress' :
                        tk.priority === 'normal' ? 'pending' : 'approved'
                      } />
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
// Skeleton loader — R1
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

      <div className="flex gap-1 border-b pb-2" style={{ borderColor: LAVENDER }}>
        {['Summary', 'Demos', 'Integrations', 'Support'].map((label) => (
          <SkeletonBlock key={label} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4" style={{ borderColor: LAVENDER }}>
            <SkeletonBlock className="h-3 w-20 mb-2" />
            <SkeletonBlock className="h-7 w-12" />
          </div>
        ))}
      </div>

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

// ============================================================
// CSV export row builders — one per sub-tab
// ============================================================

function buildSummaryRows(data: any): any[][] {
  const { demos, scenarios, integration, sow, tasks, tickets, demosAgg, scenariosAgg } = data
  const rows: any[][] = []
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
  Object.entries(tickets.byStatus || {}).forEach(([k, v]) => rows.push(['Ticket status', k, v as number]))
  rows.push(['Ticket priority', 'Priority', 'Count'])
  Object.entries(tickets.byPriority || {}).forEach(([k, v]) => rows.push(['Ticket priority', k, v as number]))
  rows.push(['', '', ''])
  rows.push(['Task status', 'Status', 'Count'])
  Object.entries(tasks.byStatus || {}).forEach(([k, v]) => rows.push(['Task status', k, v as number]))
  rows.push(['', '', ''])
  rows.push(['Demo', 'Owner', 'Scenarios'])
  demos.forEach((d: any) =>
    rows.push([d.name, d.owner?.email || '—', d._count?.scenarios || 0]),
  )
  return rows
}

function buildDemosRows({ demos, scenarios }: { demos: any[]; scenarios: any[] }): any[][] {
  const rows: any[][] = []
  rows.push(['Demo', 'Owner', 'Scenarios', 'Status', 'Created'])
  demos.forEach((demo) => {
    const demoScenarios = scenarios.filter((s: any) => s.demoId === demo.id)
    if (demoScenarios.length === 0) {
      rows.push([demo.name, demo.owner?.email || '—', 0, '—', '—'])
    } else {
      demoScenarios.forEach((s) => {
        rows.push([
          demo.name,
          demo.owner?.email || '—',
          demoScenarios.length,
          s.status,
          new Date(s.createdAt).toLocaleDateString(),
        ])
      })
    }
  })
  return rows
}

function buildIntegrationsRows({ integration, sow, tasks }: any): any[][] {
  const rows: any[][] = []
  rows.push(['Section', 'Key', 'Value'])
  rows.push(['Integrations', 'Total', integration.total || 0])
  rows.push(['SOWs', 'Total', sow.total || 0])
  rows.push(['Tasks', 'Total', tasks.total || 0])
  rows.push(['', '', ''])
  rows.push(['Integration status', 'Status', 'Count'])
  Object.entries(integration.byStatus || {}).forEach(([k, v]) =>
    rows.push(['Integration status', k, v as number]),
  )
  rows.push(['', '', ''])
  rows.push(['SOW status', 'Status', 'Count'])
  Object.entries(sow.byStatus || {}).forEach(([k, v]) =>
    rows.push(['SOW status', k, v as number]),
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
  rows.push(['SOW', 'Status', 'Owner', 'Updated'])
  sow.recent?.forEach((s: any) =>
    rows.push([s.name, s.status, s.owner?.email || '—', new Date(s.updatedAt).toLocaleDateString()]),
  )
  return rows
}

function buildSupportRows({ tickets }: any): any[][] {
  const rows: any[][] = []
  rows.push(['Ticket', 'Subject', 'Status', 'Priority', 'Submitted by', 'Assigned to', 'Created'])
  tickets.recent?.forEach((tk: any) => {
    rows.push([
      tk.id,
      tk.subject || tk.title || '',
      tk.status,
      tk.priority,
      tk.submittedBy?.email || '—',
      tk.assignedTo?.name || tk.assignedTo?.email || '—',
      new Date(tk.createdAt).toLocaleDateString(),
    ])
  })
  rows.push(['', '', '', '', '', '', ''])
  rows.push(['Status summary', 'Status', 'Count'])
  Object.entries(tickets.byStatus || {}).forEach(([k, v]) =>
    rows.push(['Status summary', k, v as number]),
  )
  rows.push(['Priority summary', 'Priority', 'Count'])
  Object.entries(tickets.byPriority || {}).forEach(([k, v]) =>
    rows.push(['Priority summary', k, v as number]),
  )
  return rows
}
