'use client'

import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3, Users, Ticket, Plug, FileText, Download, RefreshCw, Building2, LifeBuoy,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis,
  YAxis, CartesianGrid, Tooltip as RTooltip, Legend, BarChart, Bar,
} from 'recharts'
import { StatusBadge, STATUS_COLORS, statusLabel } from './StatusBadge'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// AdminReportsSubTab — admin-only, cross-platform analytics.
//
// Applies the MassaPro Reporting Best Practices Playbook to the
// admin analytics view. Reuses /api/reporting (which for admins returns
// global counts across all users).
//
// Improvements over the previous version:
//   - Real charts (recharts) instead of badge-only tallies — Audit P0
//   - Skeleton loading that matches content geometry — Playbook R1
//   - Shared StatusBadge — Playbook R12
//   - CSV export — Audit P1
//   - ARIA labels on every icon-only control — Playbook R13
//   - Toast feedback on every mutation — Playbook R6
//   - Differentiated empty states — Playbook R5
export default function AdminReportsSubTab() {
  const { t } = useLanguage()
  const { data: reporting, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['reporting'],
    queryFn: async () => {
      const res = await fetch('/api/reporting')
      if (!res.ok) throw new Error('Failed to load')
      return res.json()
    },
  })
  const { data: users } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  if (isLoading) {
    return <AdminReportsSkeleton />
  }

  const handleRefresh = () => {
    refetch()
    toast.success('Admin analytics refreshed', {
      description: 'Latest cross-platform data fetched.',
    })
  }
  const handleExport = () => {
    const rows: any[] = []
    rows.push(['Section', 'Key', 'Value'])
    rows.push(['Users', 'Total', usersList.length])
    rows.push(['Companies', 'Total', companies.length])
    rows.push(['Tickets', 'Total', tickets.total])
    rows.push(['SOWs', 'Total', sow.total])
    rows.push(['Integrations', 'Total', integration.total])
    rows.push(['', '', ''])

    rows.push(['User role', 'Role', 'Count'])
    Object.entries(usersByRole).forEach(([k, v]) => rows.push(['User role', k, v as number]))
    rows.push(['User status', 'Status', 'Count'])
    Object.entries(usersByStatus).forEach(([k, v]) => rows.push(['User status', k, v as number]))
    rows.push(['', '', ''])

    rows.push(['Ticket', 'Subject', 'Status', 'Priority', 'Submitted by', 'Created'])
    tickets.recent.forEach((tk: any) =>
      rows.push([
        'Ticket',
        tk.subject || tk.title || '',
        tk.status,
        tk.priority,
        tk.submittedBy?.email || '—',
        new Date(tk.createdAt).toLocaleDateString(),
      ]),
    )

    if (rows.length === 0) {
      toast.error('Nothing to export')
      return
    }
    downloadCsv('massapro-admin-reports.csv', rows)
    toast.success('Export ready', {
      description: `Exported ${rows.length} rows to massapro-admin-reports.csv.`,
    })
  }

  const usersList = users?.users || []
  const companies = companiesData?.companies || []
  const tickets = reporting?.tickets || { byStatus: {}, byPriority: {}, total: 0, recent: [] }
  const integration = reporting?.integration || { byStatus: {}, total: 0 }
  const sow = reporting?.sow || { byStatus: {}, total: 0, recent: [] }
  const tasks = reporting?.tasks || { byStatus: {}, byService: {}, total: 0 }
  const cadence: { date: string; tickets: number; integrations: number; sows: number }[] =
    reporting?.cadence || []

  const usersByRole = usersList.reduce((acc: Record<string, number>, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const usersByStatus = usersList.reduce((acc: Record<string, number>, u: any) => {
    acc[u.status] = (acc[u.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userRoleData = Object.entries(usersByRole).map(([k, v]) => ({
    name: k.replace('_', ' '),
    value: v as number,
    color: k === 'super_admin' ? '#9333EA' : k === 'admin' ? '#A855F7' : '#C084FC',
  }))

  const cadenceData = cadence.map((d) => ({
    date: d.date.slice(5),
    full: d.date,
    tickets: d.tickets,
    integrations: d.integrations,
    sows: d.sows,
  }))

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-bold flex items-center gap-2" style={{ color: ORCHID }}>
            <BarChart3 className="h-5 w-5" aria-hidden />
            {t('admin.reports.title')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label="Refresh admin analytics"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            aria-label="Export admin analytics to CSV"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AdminKpi label="Users" value={usersList.length} icon={<Users className="h-5 w-5" />} />
        <AdminKpi label="Companies" value={companies.length} icon={<Building2 className="h-5 w-5" />} />
        <AdminKpi label="Tickets" value={tickets.total} icon={<LifeBuoy className="h-5 w-5" />} />
        <AdminKpi label="SOWs" value={sow.total} icon={<FileText className="h-5 w-5" />} />
        <AdminKpi label="Integrations" value={integration.total} icon={<Plug className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users by role (donut) */}
        <AdminChartCard title="Users by role" description={`${usersList.length} users across the platform`}>
          {userRoleData.length === 0 ? (
            <EmptyChartState message="No users yet" />
          ) : (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userRoleData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {userRoleData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RTooltip />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminChartCard>

        {/* Activity cadence (line) */}
        <AdminChartCard title="Platform activity (8 weeks)" description="Tickets, integrations and SOWs created per day">
          {cadenceData.every((d) => d.tickets + d.integrations + d.sows === 0) ? (
            <EmptyChartState message="No activity in the last 8 weeks" />
          ) : (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cadenceData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E8FF" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525B' }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525B' }} />
                  <RTooltip
                    labelFormatter={(_, p) => p?.[0]?.payload?.full
                      ? new Date(p[0].payload.full).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : ''}
                  />
                  <Legend verticalAlign="top" height={28} iconType="line" wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="tickets" name="Tickets" stroke="#9333EA" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="integrations" name="Integrations" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="sows" name="SOWs" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users summary */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Users className="h-5 w-5" aria-hidden /> Users
              <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-md" style={{ background: LAVENDER, color: JET }}>
                {usersList.length} total
              </span>
            </CardTitle>
            <CardDescription>By role and status</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>By role</h4>
              <div className="flex flex-wrap gap-2">
                {['super_admin', 'admin', 'user', 'demo'].map((r) => (
                  <div key={r} className="flex items-center gap-1">
                    <StatusBadge status={r === 'super_admin' ? 'live' : r === 'admin' ? 'approved' : 'pending'} />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>{usersByRole[r] || 0}</span>
                    <span className="text-xs" style={{ color: JET, opacity: 0.7 }}>{r.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>By status</h4>
              <div className="flex flex-wrap gap-2">
                {['active', 'pending', 'suspended', 'deleted'].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <StatusBadge status={
                      s === 'active' ? 'approved' :
                      s === 'pending' ? 'pending' :
                      s === 'suspended' ? 'blocked' : 'failed'
                    } />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>{usersByStatus[s] || 0}</span>
                    <span className="text-xs" style={{ color: JET, opacity: 0.7 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies & Teams */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Building2 className="h-5 w-5" aria-hidden /> Companies &amp; Teams
              <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-md" style={{ background: LAVENDER, color: JET }}>
                {companies.length} total
              </span>
            </CardTitle>
            <CardDescription>Companies + their member and team counts</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {companies.length === 0 ? (
              <p className="text-sm italic text-center py-6" style={{ color: JET, opacity: 0.6 }}>
                No companies yet.
              </p>
            ) : (
              <div className="space-y-1">
                {companies.slice(0, 8).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="flex-1 truncate" style={{ color: JET }}>{c.name}</span>
                    <span className="text-xs" style={{ color: JET, opacity: 0.7 }}>
                      {c._count?.members || 0} members · {c._count?.teams || 0} teams
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Ticket className="h-5 w-5" aria-hidden /> {t('reporting.tickets')}
              <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-md" style={{ background: LAVENDER, color: JET }}>
                {tickets.total} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>{t('reporting.byStatus')}</h4>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <StatusBadge status={s} />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>
                      {(tickets.byStatus as any)[s] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>{t('reporting.byPriority')}</h4>
              <div className="flex flex-wrap gap-2">
                {['low', 'normal', 'high', 'critical'].map((p) => (
                  <div key={p} className="flex items-center gap-1">
                    <StatusBadge status={
                      p === 'critical' ? 'blocked' :
                      p === 'high' ? 'in-progress' :
                      p === 'normal' ? 'pending' : 'approved'
                    } />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>
                      {(tickets.byPriority as any)[p] || 0}
                    </span>
                    <span className="text-xs" style={{ color: JET, opacity: 0.7 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation + SOW */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Plug className="h-5 w-5" aria-hidden /> {t('reporting.integration')} + {t('reporting.sow')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                {t('reporting.integration')} ({integration.total})
              </h4>
              <div className="flex flex-wrap gap-2">
                {['draft', 'submitted'].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <StatusBadge status={s} />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>
                      {(integration.byStatus as any)[s] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                {t('reporting.sow')} ({sow.total})
              </h4>
              <div className="flex flex-wrap gap-2">
                {['draft', 'submitted', 'approved', 'rejected'].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <StatusBadge status={s} />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>
                      {(sow.byStatus as any)[s] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>Tasks by status</h4>
              <div className="flex flex-wrap gap-2">
                {['pending', 'in-progress', 'completed', 'blocked'].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <StatusBadge status={s} />
                    <span className="text-xs font-bold" style={{ color: ORCHID }}>
                      {(tasks.byStatus as any)[s] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function AdminKpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
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

function AdminChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2" style={{ color: ORCHID }}>
          <BarChart3 className="h-3.5 w-3.5" aria-hidden /> {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-center">
      <p className="text-xs italic" style={{ color: JET, opacity: 0.7 }}>{message}</p>
    </div>
  )
}

function AdminReportsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading admin analytics">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4" style={{ borderColor: LAVENDER }}>
            <SkeletonBlock className="h-3 w-16 mb-2" />
            <SkeletonBlock className="h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4" style={{ borderColor: LAVENDER }}>
            <SkeletonBlock className="h-4 w-40 mb-2" />
            <SkeletonBlock className="h-3 w-56 mb-3" />
            <SkeletonBlock className="h-[200px] w-full rounded" />
          </div>
        ))}
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
