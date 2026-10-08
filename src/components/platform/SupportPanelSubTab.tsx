'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  LifeBuoy, Paperclip, AlertTriangle, AlertCircle, Clock, ArrowDown, LayoutPanelLeft,
} from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

type Priority = 'low' | 'normal' | 'high' | 'critical'

const PRIORITY_META: Record<Priority, { color: string; bg: string; icon: React.ReactNode }> = {
  low: { color: '#10B981', bg: '#D1FAE5', icon: <ArrowDown className="h-3 w-3" /> },
  normal: { color: '#3B82F6', bg: '#DBEAFE', icon: <Clock className="h-3 w-3" /> },
  high: { color: '#F59E0B', bg: '#FEF3C7', icon: <AlertCircle className="h-3 w-3" /> },
  critical: { color: '#EF4444', bg: '#FEE2E2', icon: <AlertTriangle className="h-3 w-3" /> },
}

// SupportPanelSubTab — the "Panel" sub-tab under Support.
//
// Per the user's confirmed sitemap:
//   )Support
//     -Panel   ← this is the - sub-tab
//
// Shows the list of tickets the user submitted (or all tickets for admins)
// plus a ticket detail dialog with attachments and CC emails.
export default function SupportPanelSubTab() {
  const { t } = useLanguage()

  const [viewTicket, setViewTicket] = useState<any | null>(null)

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support-tickets')
      if (!res.ok) throw new Error('Failed to load tickets')
      return res.json()
    },
  })
  const tickets = ticketsData?.tickets || []

  return (
    <div className="space-y-4">
      <Card style={{ borderColor: LAVENDER }}>
        <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
          <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
            <LayoutPanelLeft className="h-5 w-5" />
            {t('platform.tab.support.panel')}
          </CardTitle>
          <CardDescription>{t('support.tickets.all')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
              <p className="text-sm italic" style={{ color: JET }}>{t('support.tickets.empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((tk: any) => {
                const meta = PRIORITY_META[tk.priority as Priority] || PRIORITY_META.normal
                return (
                  <button
                    key={tk.id}
                    type="button"
                    onClick={() => setViewTicket(tk)}
                    className="w-full text-start rounded-lg border-2 p-3 hover:shadow-md transition-all"
                    style={{ borderColor: LAVENDER, background: WHITE }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm" style={{ color: JET }}>
                          {tk.subject}
                        </span>
                        <span className="text-xs block mt-0.5" style={{ color: JET, opacity: 0.65 }}>
                          {new Date(tk.createdAt).toLocaleDateString()} · {tk.submittedBy?.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs" style={{ borderColor: meta.color, color: meta.color }}>
                          {meta.icon} {t(`support.priority.${tk.priority}`)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t(`support.tickets.${tk.status === 'in_progress' ? 'inProgress' : tk.status}`)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Ticket detail dialog ===== */}
      <Dialog open={!!viewTicket} onOpenChange={(open) => !open && setViewTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>{viewTicket?.subject}</DialogTitle>
            <DialogDescription>
              {viewTicket && new Date(viewTicket.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {t(`support.priority.${viewTicket.priority}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`support.tickets.${viewTicket.status === 'in_progress' ? 'inProgress' : viewTicket.status}`)}
                </Badge>
                {viewTicket.assignedTo && (
                  <Badge variant="outline" className="text-xs">
                    {t('support.assignedTo')}: {viewTicket.assignedTo.name || viewTicket.assignedTo.email}
                  </Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: JET }}>
                {viewTicket.description}
              </p>
              {viewTicket.ccEmails && Array.isArray(viewTicket.ccEmails) && viewTicket.ccEmails.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase" style={{ color: JET }}>
                    {t('support.ccEmails')}:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewTicket.ccEmails.map((e: string) => (
                      <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewTicket.attachments && viewTicket.attachments.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase" style={{ color: JET }}>
                    {t('support.attachments')}:
                  </span>
                  <div className="space-y-1 mt-1">
                    {viewTicket.attachments.map((a: any) => (
                      <a
                        key={a.id}
                        href={`/api/support-tickets/${viewTicket.id}/attachments?attachmentId=${a.id}`}
                        className="block text-sm hover:underline"
                        style={{ color: ORCHID }}
                      >
                        <Paperclip className="h-3 w-3 inline mr-1.5" />
                        {a.fileName} ({(a.fileSize / 1024).toFixed(1)} KB)
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
