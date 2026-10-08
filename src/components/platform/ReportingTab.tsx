'use client'

import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3, Ticket, ListChecks, Plug, FileText, Loader2, ChevronRight,
} from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

// ReportingTab — aggregates tickets, tasks, implementation status and SOW
// status into a single reporting view. Pulls from /api/reporting which
// returns the relevant counts grouped by status / priority / service.
export default function ReportingTab() {
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['reporting'],
    queryFn: async () => {
      const res = await fetch('/api/reporting')
      if (!res.ok) throw new Error('Failed to load reporting')
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

  const tickets = data?.tickets || { byStatus: {}, byPriority: {}, total: 0, recent: [] }
  const integration = data?.integration || { byStatus: {}, total: 0 }
  const sow = data?.sow || { byStatus: {}, total: 0, recent: [] }
  const tasks = data?.tasks || { byStatus: {}, byService: {}, total: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <BarChart3 className="h-5 w-5" />
          {t('reporting.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('reporting.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tickets */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Ticket className="h-5 w-5" />
              {t('reporting.tickets')}
              <Badge variant="outline" className="ml-auto">{tickets.total} {t('reporting.total')}</Badge>
            </CardTitle>
            <CardDescription>{t('reporting.byStatus')} / {t('reporting.byPriority')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>
                {t('reporting.byStatus')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: LAVENDER, color: JET, background: WHITE }}
                  >
                    {t(`support.tickets.${s === 'in_progress' ? 'inProgress' : s}`)}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(tickets.byStatus as any)[s] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>
                {t('reporting.byPriority')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {['low', 'normal', 'high', 'critical'].map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: LAVENDER, color: JET, background: WHITE }}
                  >
                    {t(`support.priority.${p}`)}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(tickets.byPriority as any)[p] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <ListChecks className="h-5 w-5" />
              {t('reporting.tasks')}
              <Badge variant="outline" className="ml-auto">{tasks.total} {t('reporting.total')}</Badge>
            </CardTitle>
            <CardDescription>{t('reporting.byStatus')} / {t('reporting.byService')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>
                {t('reporting.byStatus')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {['pending', 'in-progress', 'completed', 'blocked'].map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: LAVENDER, color: JET, background: WHITE }}
                  >
                    {s.replace('-', ' ')}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(tasks.byStatus as any)[s] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>
                {t('reporting.byService')}
              </h4>
              {Object.keys(tasks.byService).length === 0 ? (
                <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>{t('reporting.empty')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tasks.byService).map(([svc, count]) => (
                    <Badge
                      key={svc}
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: LAVENDER, color: JET, background: WHITE }}
                    >
                      {svc}:
                      <span className="ml-1 font-bold" style={{ color: ORCHID }}>{count as number}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Implementation */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Plug className="h-5 w-5" />
              {t('reporting.integration')}
              <Badge variant="outline" className="ml-auto">{integration.total} {t('reporting.total')}</Badge>
            </CardTitle>
            <CardDescription>{t('reporting.byStatus')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {['draft', 'submitted'].map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: LAVENDER, color: JET, background: WHITE }}
                >
                  {s}:
                  <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                    {(integration.byStatus as any)[s] || 0}
                  </span>
                </Badge>
              ))}
              {integration.total === 0 && (
                <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>{t('reporting.empty')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SOW Status */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <FileText className="h-5 w-5" />
              {t('reporting.sow')}
              <Badge variant="outline" className="ml-auto">{sow.total} {t('reporting.total')}</Badge>
            </CardTitle>
            <CardDescription>{t('reporting.byStatus')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              {['draft', 'submitted', 'approved', 'rejected'].map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: LAVENDER, color: JET, background: WHITE }}
                >
                  {s}:
                  <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                    {(sow.byStatus as any)[s] || 0}
                  </span>
                </Badge>
              ))}
              {sow.total === 0 && (
                <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>{t('reporting.empty')}</p>
              )}
            </div>
            {sow.recent && sow.recent.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>
                  {t('reporting.recent')}
                </h4>
                <div className="space-y-1">
                  {sow.recent.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-3 w-3" style={{ color: ORCHID }} />
                      <span className="flex-1 truncate" style={{ color: JET }}>{s.name}</span>
                      <Badge variant="outline" className="text-xs">{s.status}</Badge>
                      <span className="text-xs" style={{ color: JET, opacity: 0.6 }}>
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
