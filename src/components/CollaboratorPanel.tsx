'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, Link2, Copy } from 'lucide-react'

interface CollaboratorPanelProps {
  scenarioId: string
}

export default function CollaboratorPanel({ scenarioId }: CollaboratorPanelProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [accessLevel, setAccessLevel] = useState('view')

  const { data: collaborations = [], isLoading } = useQuery({
    queryKey: ['collaborations', scenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}/collaborations`)
      if (!res.ok) throw new Error('Failed to fetch collaborations')
      return res.json()
    },
  })

  const addCollaborator = async () => {
    if (!email) {
      toast.error('Please enter an email address')
      return
    }
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/collaborations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorEmail: email, accessLevel }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Collaborator added!')
        setEmail('')
        queryClient.invalidateQueries({ queryKey: ['collaborations', scenarioId] })
      } else {
        toast.error(data.error || 'Failed to add collaborator')
      }
    } catch (error) {
      toast.error('Failed to add collaborator')
    }
  }

  const generatePublicLink = async () => {
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/collaborations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePublicLink: true }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Public link generated!')
        queryClient.invalidateQueries({ queryKey: ['collaborations', scenarioId] })
      }
    } catch (error) {
      toast.error('Failed to generate link')
    }
  }

  const removeCollaborator = async (collaborationId: string) => {
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/collaborations?collaborationId=${collaborationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Collaborator removed')
        queryClient.invalidateQueries({ queryKey: ['collaborations', scenarioId] })
      }
    } catch (error) {
      toast.error('Failed to remove collaborator')
    }
  }

  const copyLink = (token: string) => {
    const link = `${window.location.origin}?share=${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link copied to clipboard!')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('tab.collaborators')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Collaborator */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t('collab.add')}</Label>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('collab.email')}
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && addCollaborator()}
            />
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">{t('collab.view')}</SelectItem>
                <SelectItem value="edit">{t('collab.edit')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addCollaborator} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Generate Public Link */}
        <Button variant="outline" size="sm" onClick={generatePublicLink}>
          <Link2 className="h-4 w-4 mr-1" />
          {t('collab.shareLink')}
        </Button>

        {/* Current Collaborators */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('general.loading')}</p>
        ) : collaborations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('general.noData')}</p>
        ) : (
          <div className="space-y-2">
            {collaborations.map((collab: any) => (
              <div key={collab.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {collab.collaborator?.name || collab.collaborator?.email || 'Public'}
                  </span>
                  <Badge variant={collab.accessLevel === 'edit' ? 'default' : 'secondary'} className="text-xs">
                    {collab.accessLevel === 'edit' ? t('collab.edit') : t('collab.view')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {collab.publicToken && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(collab.publicToken)}
                      className="h-7"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      <span className="text-xs">{t('collab.publicLink')}</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCollaborator(collab.id)}
                    className="text-destructive hover:text-destructive h-7"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
