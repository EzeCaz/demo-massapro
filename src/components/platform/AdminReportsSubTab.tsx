'use client'

import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Users, Ticket, Plug, FileText, Loader2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// AdminReportsSubTab — admin-only, cross-platform analytics.
//
// Reuses /api/reporting which (for admins) returns global counts across
// all users. Also pulls the users count and companies/teams count for a
// comprehensive admin dashboard.
export default function AdminReportsSubTab() {
  const { t } = useLanguage()
  const { data: reporting, isLoading } = useQuery({
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
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        {t('general.loading')}
      </div>
    )
  }

  const usersList = users?.users || []
  const companies = companiesData?.companies || []
  const tickets = reporting?.tickets || { byStatus: {}, byPriority: {}, total: 0, recent: [] }
  const integration = reporting?.integration || { byStatus: {}, total: 0 }
  const sow = reporting?.sow || { byStatus: {}, total: 0, recent: [] }

  // Users by role
  const usersByRole = usersList.reduce((acc: Record<string, number>, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  // Users by status
  const usersByStatus = usersList.reduce((acc: Record<string, number>, u: any) => {
    acc[u.status] = (acc[u.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <BarChart3 className="h-5 w-5" />
          {t('admin.reports.title')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.reports.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users summary */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Users className="h-5 w-5" /> Users
              <Badge variant="outline" className="ml-auto">{usersList.length} total</Badge>
            </CardTitle>
            <CardDescription>By role / by status</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>By role</h4>
              <div className="flex flex-wrap gap-2">
                {['super_admin', 'admin', 'user', 'demo'].map((r) => (
                  <Badge key={r} variant="outline" className="text-xs" style={{ borderColor: LAVENDER, color: JET, background: '#fff' }}>
                    {r.replace('_', ' ')}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>{usersByRole[r] || 0}</span>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: JET }}>By status</h4>
              <div className="flex flex-wrap gap-2">
                {['active', 'pending', 'suspended', 'deleted'].map((s) => (
                  <Badge key={s} variant="outline" className="text-xs" style={{ borderColor: LAVENDER, color: JET, background: '#fff' }}>
                    {s}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>{usersByStatus[s] || 0}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies & Teams */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Users className="h-5 w-5" /> Companies & Teams
              <Badge variant="outline" className="ml-auto">{companies.length} companies</Badge>
            </CardTitle>
            <CardDescription>Companies + their team count</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {companies.length === 0 ? (
              <p className="text-sm italic" style={{ color: JET, opacity: 0.6 }}>No companies yet.</p>
            ) : (
              <div className="space-y-1">
                {companies.slice(0, 8).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
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
              <Ticket className="h-5 w-5" /> {t('reporting.tickets')}
              <Badge variant="outline" className="ml-auto">{tickets.total} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>{t('reporting.byStatus')}</h4>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s.replace('_', ' ')}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(tickets.byStatus as any)[s] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>{t('reporting.byPriority')}</h4>
              <div className="flex flex-wrap gap-2">
                {['low', 'normal', 'high', 'critical'].map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(tickets.byPriority as any)[p] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation + SOW */}
        <Card style={{ borderColor: LAVENDER }}>
          <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <Plug className="h-5 w-5" /> {t('reporting.integration')} + {t('reporting.sow')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                {t('reporting.integration')} ({integration.total})
              </h4>
              <div className="flex flex-wrap gap-2">
                {['draft', 'submitted'].map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(integration.byStatus as any)[s] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: JET }}>
                {t('reporting.sow')} ({sow.total})
              </h4>
              <div className="flex flex-wrap gap-2">
                {['draft', 'submitted', 'approved', 'rejected'].map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}:
                    <span className="ml-1 font-bold" style={{ color: ORCHID }}>
                      {(sow.byStatus as any)[s] || 0}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
