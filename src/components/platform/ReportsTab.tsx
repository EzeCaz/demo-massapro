'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, FileText, Plug, LifeBuoy, ListChecks, Users, Loader2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

// ReportsTab — new "Reports" main tab with 4 sub-tabs (per the user's brief #6):
//   A) Summary       — graphs + counts of demos, scenarios, users, integrations,
//                      SOWs, projects, tasks (status + services), support tickets
//                      (status + priority).
//   B) Demos & Scenarios — detailed reporting (per-demo scenario list, status
//                          breakdown, attachments count, comments count).
//   C) Integrations & SOW — detailed reporting (per-setup status, per-SOW status,
//                            SOW task breakdown by status and by service).
//   D) Support       — detailed reporting (per-ticket status, priority, owner,
//                      recent activity).
export default function ReportsTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('summary')

  const { data: reporting, isLoading } = useQuery({
    queryKey: ['reporting'],
    queryFn: async () => {
      const res = await fetch('/api/reporting')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const { data: demosData } = useQuery({
    queryKey: ['demos'],
    queryFn: async () => {
      const res = await fetch('/api/demos')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const { data: scenariosData } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        {t('general.loading')}
      </div>
    )
  }

  const demos = demosData?.demos || []
  const scenarios = Array.isArray(scenariosData) ? scenariosData : []
  const tickets = reporting?.tickets || { byStatus: {}, byPriority: {}, total: 0, recent: [] }
  const integration = reporting?.integration || { byStatus: {}, total: 0 }
  const sow = reporting?.sow || { byStatus: {}, total: 0, recent: [] }
  const tasks = reporting?.tasks || { byStatus: {}, byService: {}, total: 0 }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <BarChart3 className="h-5 w-5" />
          {t('reporting.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('reporting.subtitle')}</p>
      </div>

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList>
          <TabsTrigger value="summary" className="text-xs sm:text-sm">{t('reporting.summary')}</TabsTrigger>
          <TabsTrigger value="demos" className="text-xs sm:text-sm">{t('reporting.demosScenarios')}</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">{t('reporting.integrationsSow')}</TabsTrigger>
          <TabsTrigger value="support" className="text-xs sm:text-sm">{t('reporting.support')}</TabsTrigger>
        </TabsList>

        {/* === Summary === */}
        <TabsContent value="summary" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Demos" value={demos.length} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Scenarios" value={scenarios.length} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Integration Setups" value={integration.total} icon={<Plug className="h-5 w-5" />} />
            <StatCard label="SOW Documents" value={sow.total} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Tasks tracked" value={tasks.total} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Support tickets" value={tickets.total} icon={<LifeBuoy className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <BarCard
              title="Demos by scenario count"
              data={demos.map((d: any) => ({ label: d.name, value: d._count?.scenarios || 0 }))}
            />
            <BarCard
              title="Scenarios by status"
              data={countBy(scenarios, 'status')}
            />
            <BarCard
              title="Integration setups by status"
              data={Object.entries(integration.byStatus).map(([k, v]) => ({ label: k, value: v as number }))}
            />
            <BarCard
              title="SOWs by status"
              data={Object.entries(sow.byStatus).map(([k, v]) => ({ label: k, value: v as number }))}
            />
            <BarCard
              title="Tasks by status"
              data={Object.entries(tasks.byStatus).map(([k, v]) => ({ label: k.replace('-', ' '), value: v as number }))}
            />
            <BarCard
              title="Support tickets by priority"
              data={Object.entries(tickets.byPriority).map(([k, v]) => ({ label: k, value: v as number }))}
            />
          </div>
        </TabsContent>

        {/* === Demos & Scenarios === */}
        <TabsContent value="demos" className="focus-visible:outline-none">
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle style={{ color: ORCHID }}>Demos &amp; Scenarios</CardTitle>
              <CardDescription>Per-demo breakdown of scenarios, status, attachments</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {demos.length === 0 ? (
                <EmptyState />
              ) : (
                demos.map((demo: any) => (
                  <DemoRow key={demo.id} demo={demo} scenarios={scenarios} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Integrations & SOW === */}
        <TabsContent value="integrations" className="focus-visible:outline-none">
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <CardTitle style={{ color: ORCHID }}>Integrations &amp; SOW</CardTitle>
              <CardDescription>Per-setup and per-SOW breakdown with task status</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {/* SOW recent list with task breakdown */}
              {sow.recent && sow.recent.length > 0 ? (
                sow.recent.map((s: any) => (
                  <div key={s.id} className="rounded-lg border-2 p-3" style={{ borderColor: LAVENDER, background: WHITE }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm" style={{ color: JET }}>{s.name}</span>
                      <Badge variant="outline" className="text-xs">{s.status}</Badge>
                    </div>
                    <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                      Updated {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
              {/* Task status summary */}
              <div className="rounded-lg p-3" style={{ background: LAVENDER }}>
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>Tasks across all SOWs (by status)</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tasks.byStatus).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-xs">
                      {k.replace('-', ' ')}: <span className="ml-1 font-bold" style={{ color: ORCHID }}>{v as number}</span>
                    </Badge>
                  ))}
                  {Object.keys(tasks.byStatus).length === 0 && (
                    <span className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>No tasks tracked yet.</span>
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
              <CardTitle style={{ color: ORCHID }}>Support</CardTitle>
              <CardDescription>Tickets by status, priority, and recent activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {tickets.recent && tickets.recent.length > 0 ? (
                tickets.recent.map((tk: any) => (
                  <div key={tk.id} className="rounded-lg border-2 p-3" style={{ borderColor: LAVENDER, background: WHITE }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm" style={{ color: JET }}>{tk.subject}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">{tk.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{tk.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                      By {tk.submittedBy?.email} · {new Date(tk.createdAt).toLocaleDateString()}
                      {tk.assignedTo && ` · Assigned to ${tk.assignedTo.name || tk.assignedTo.email}`}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---- Small sub-components ----------------------------------------------

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wide" style={{ color: JET, opacity: 0.7 }}>
            {label}
          </span>
          <span style={{ color: ORCHID }}>{icon}</span>
        </div>
        <div className="text-3xl font-extrabold" style={{ color: ORCHID }}>{value}</div>
      </CardContent>
    </Card>
  )
}

function BarCard({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader>
        <CardTitle className="text-sm" style={{ color: ORCHID }}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {data.length === 0 ? (
          <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>No data yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map((d, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: JET }}>{d.label}</span>
                  <span className="font-bold" style={{ color: ORCHID }}>{d.value}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: LAVENDER }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.value / max) * 100}%`, background: ORCHID }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function countBy(arr: any[], key: string): { label: string; value: number }[] {
  const map: Record<string, number> = {}
  arr.forEach((item) => {
    const k = String(item[key] || 'unknown')
    map[k] = (map[k] || 0) + 1
  })
  return Object.entries(map).map(([label, value]) => ({ label, value }))
}

function EmptyState() {
  return (
    <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
      <p className="text-sm italic" style={{ color: JET }}>No data available.</p>
    </div>
  )
}

function DemoRow({ demo, scenarios }: { demo: any; scenarios: any[] }) {
  const demoScenarios = scenarios.filter((s: any) => s.demoId === demo.id)
  return (
    <div className="rounded-lg border-2 p-3" style={{ borderColor: LAVENDER, background: WHITE }}>
      <div className="font-semibold text-sm mb-2" style={{ color: JET }}>{demo.name}</div>
      <div className="text-xs mb-3" style={{ color: JET, opacity: 0.7 }}>
        Owner: {demo.owner?.name || demo.owner?.email} · {demoScenarios.length} scenarios
      </div>
      {demoScenarios.length === 0 ? (
        <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>No scenarios in this demo.</p>
      ) : (
        <div className="space-y-1">
          {demoScenarios.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between text-sm border-t pt-1" style={{ borderColor: LAVENDER }}>
              <span style={{ color: JET }}>{s.name}</span>
              <Badge variant="outline" className="text-xs">{s.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
