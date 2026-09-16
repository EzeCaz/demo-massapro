'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Plug, FileText, Loader2, Trash2 } from 'lucide-react'

export default function IntegrationSetupList() {
  const { t } = useLanguage()
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: setups = [], isLoading } = useQuery({
    queryKey: ['integration-setups'],
    queryFn: async () => {
      const res = await fetch('/api/integration-setups')
      if (!res.ok) throw new Error('Failed to fetch integration setups')
      return res.json()
    },
  })

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/integration-setups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() || t('integration.title') }),
      })
      if (!res.ok) throw new Error('Create failed')
      const created = await res.json()
      queryClient.invalidateQueries({ queryKey: ['integration-setups'] })
      toast.success(t('integration.created'))
      setCreateOpen(false)
      setNewName('')
      router.push(`/integration-setup/${created.id}`)
    } catch (e) {
      toast.error(t('integration.error'))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('general.confirm'))) return
    try {
      const res = await fetch(`/api/integration-setups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      queryClient.invalidateQueries({ queryKey: ['integration-setups'] })
      toast.success(t('integration.deleted'))
    } catch (e) {
      toast.error(t('integration.error'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-vivid-blue" />
      </div>
    )
  }

  const userRole = (session?.user as any)?.role
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6 text-vivid-blue" />
            {t('integration.listTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('integration.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-vivid-blue hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> {t('integration.addNew')}
        </Button>
      </div>

      {setups.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center">
            <Plug className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{t('integration.listEmpty')}</p>
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> {t('integration.addNew')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setups.map((setup: any) => (
            <Card key={setup.id} className="hover:shadow-md transition-shadow cursor-pointer group" >
              <CardContent
                className="pt-5 space-y-3"
                onClick={() => router.push(`/integration-setup/${setup.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-vivid-blue flex-shrink-0" />
                    <h3 className="font-semibold truncate">{setup.name}</h3>
                  </div>
                  <Badge variant={setup.status === 'submitted' ? 'default' : 'secondary'}
                    className={setup.status === 'submitted' ? 'bg-emerald text-white flex-shrink-0' : 'flex-shrink-0'}>
                    {setup.status === 'submitted' ? t('integration.submitted') : t('integration.draft')}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {setup.client?.name || setup.client?.email || ''}
                  {isAdmin && setup.client?.company && ` · ${setup.client.company}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(setup.createdAt).toLocaleDateString()}
                </div>
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(setup.id)}
                    className="text-destructive hover:text-destructive h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('integration.newDialogTitle')}</DialogTitle>
            <DialogDescription>{t('integration.subtitle')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-setup-name">{t('integration.nameLabel')}</Label>
            <Input
              id="new-setup-name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t('integration.namePlaceholder')}
              onKeyDown={e => { if (e.key === 'Enter' && !creating) handleCreate() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t('integration.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-vivid-blue hover:bg-blue-700">
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {t('integration.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
