'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle, Clock } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface AdminNotesPanelProps {
  scenarioId: string
}

export default function AdminNotesPanel({ scenarioId }: AdminNotesPanelProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['adminNotes', scenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}/admin-notes`)
      if (!res.ok) throw new Error('Failed to fetch admin notes')
      return res.json()
    },
  })

  const markAsRead = async (noteId: string) => {
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/admin-notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, isRead: true }),
      })
      if (res.ok) {
        toast.success('Marked as read')
        queryClient.invalidateQueries({ queryKey: ['adminNotes', scenarioId] })
      }
    } catch (error) {
      toast.error('Failed to mark as read')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('tab.adminNotes')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('general.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('general.noData')}</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {notes.map((note: any) => (
              <div
                key={note.id}
                className={`p-3 border rounded-lg ${note.isRead ? 'bg-muted/30' : 'bg-blue-50 border-vivid-blue/30'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {note.sentByAdmin?.name || 'Admin'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!note.isRead && userRole !== 'admin' && userRole !== 'super_admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(note.id)}
                      className="text-vivid-blue hover:text-vivid-blue h-7"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('adminNotes.markRead')}
                    </Button>
                  )}
                  {note.isRead && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Read
                    </Badge>
                  )}
                  {!note.isRead && (
                    <Badge className="text-xs bg-vivid-blue">
                      <Clock className="h-3 w-3 mr-1" />
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{note.note}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
