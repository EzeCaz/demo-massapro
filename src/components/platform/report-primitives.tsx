'use client'

// Shared report-building primitives used by ReportsTab and its sub-tabs.
// All of these follow the MassaPro Reporting Best Practices Playbook:
//   - Skeleton loading matching content geometry (R1)
//   - Shared StatusBadge with 6 reserved hue slots (R12)
//   - ARIA labels on icon-only controls (R13)
//   - CSV export (Audit P1)
//   - Toast feedback on every mutation (R6)

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis,
  YAxis, CartesianGrid, Tooltip as RTooltip, Legend, BarChart, Bar,
} from 'recharts'
import {
  Download, RefreshCw, Sparkles, Inbox, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export const ORCHID = '#9333EA'
export const JET = '#030712'
export const LAVENDER = '#F3E8FF'
export const WHITE = '#FFFFFF'
export const GREY = '#666666'

export const CHART_PALETTE = ['#9333EA', '#7E22CE', '#6B21A8', '#A855F7', '#C084FC', '#E9D5FF']

// ============================================================
// StatCard — KPI card used at the top of every report sub-tab
// ============================================================
export function StatCard({
  label, value, icon, color,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wide" style={{ color: JET, opacity: 0.7 }}>
            {label}
          </span>
          <span style={{ color: color || ORCHID }} aria-hidden>{icon}</span>
        </div>
        <div className="text-3xl font-extrabold" style={{ color: color || ORCHID }}>{value}</div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// ChartCard — wrapper for any chart with a title + description
// ============================================================
export function ChartCard({
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
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

// ============================================================
// DonutChart — status distribution donut
// ============================================================
export function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
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
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
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

// ============================================================
// CadenceChart — 8-week daily activity line chart
// ============================================================
export function CadenceChart({
  data, keys = ['tickets', 'integrations', 'sows'],
  colors = { tickets: '#9333EA', integrations: '#10B981', sows: '#F59E0B' },
  labels = { tickets: 'Tickets', integrations: 'Integrations', sows: 'SOWs' },
  height = 220,
}: {
  data: { date: string; full?: string; tickets?: number; integrations?: number; sows?: number }[]
  keys?: ('tickets' | 'integrations' | 'sows')[]
  colors?: Record<string, string>
  labels?: Record<string, string>
  height?: number
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LAVENDER} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525B' }} interval={6} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525B' }} />
          <RTooltip
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload
              return p?.full
                ? new Date(p.full).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : ''
            }}
          />
          <Legend verticalAlign="top" height={28} iconType="line" wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={labels[k]}
              stroke={colors[k]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// BarChartMini — horizontal/vertical bar chart for comparisons
// ============================================================
export function BarChartMini({
  data, height = 220, maxBarSize = 48,
}: {
  data: { name: string; value: number; fullName?: string }[]
  height?: number
  maxBarSize?: number
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LAVENDER} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#52525B' }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525B' }} />
          <RTooltip formatter={(v: number, n, p: any) => [v, p?.payload?.fullName || n]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={maxBarSize}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// EmptyChartState + EmptyState — differentiated empty states (R5)
// ============================================================
export function EmptyChartState({
  kind = 'no-data', message,
}: {
  kind?: 'no-data' | 'no-match'
  message: string
}) {
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

export function EmptyState({
  kind = 'no-data', message, hint, onAction, actionLabel,
}: {
  kind?: 'no-data' | 'no-match'
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
        <Button variant="outline" size="sm" className="mt-3" onClick={onAction} aria-label={actionLabel}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// ============================================================
// ErrorState — when the API returns a 500, show a clear message
// with a retry button (rather than silently rendering empty charts)
// ============================================================
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
      <div className="inline-flex rounded-full p-3 mb-3" style={{ background: '#FEE2E2' }} aria-hidden>
        <AlertCircle className="h-6 w-6" style={{ color: '#DC2626' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: JET }}>Couldn't load report data</p>
      <p className="text-xs mt-1 italic" style={{ color: JET, opacity: 0.7 }}>
        The platform encountered an error while fetching the data. Try refreshing.
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry} aria-label="Retry loading reports">
        <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden /> Retry
      </Button>
    </div>
  )
}

// ============================================================
// ReportHeader — title + subtitle + Refresh + CSV buttons
// ============================================================
export function ReportHeader({
  title, subtitle, onRefresh, onExport, isFetching,
}: {
  title: string
  subtitle: string
  onRefresh: () => void
  onExport: () => void
  isFetching: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <Sparkles className="h-5 w-5" aria-hidden />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching} aria-label="Refresh reports">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} aria-label="Export to CSV">
          <Download className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">CSV</span>
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// CSV download utility (P1 from Capabilities Audit)
// ============================================================
export function downloadCsv(filename: string, rows: any[][]) {
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

// Standard CSV-export toast feedback (R6)
export function exportCsvToast(rows: any[][], filename: string) {
  if (rows.length === 0) {
    toast.error('Nothing to export', { description: 'There is no report data to export yet.' })
    return
  }
  downloadCsv(filename, rows)
  toast.success('Export ready', { description: `Exported ${rows.length} rows to ${filename}.` })
}

// ============================================================
// SkeletonBlock — building block for skeleton loaders (R1)
// ============================================================
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className || ''}`}
      style={{ background: LAVENDER }}
    />
  )
}
