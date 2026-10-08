'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Users, FileText, Loader2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// DemoSubTab — list of Demos the current user can see (owner or has access).
// "Create new Demo" button opens a naming dialog.
//
// Visibility:
//   - super_admin / admin: sees ALL Demos
//   - regular user: sees ONLY Demos where they're the owner OR have a
//     DemoAccess row (view / comment / edit)
export default function DemoSubTab() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [editDemo, setEditDemo] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const { data: demosData, isLoading } = useQuery({
    queryKey: ['demos'],
    queryFn: async () => {
      const res = await fetch('/api/demos')
      if (!res.ok) throw new Error('Failed to load demos')
      return res.json()
    },
  })
  const demos = demosData?.demos || []

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] })
      toast.success('Demo created')
      setCreateForm({ name: '', description: '' })
      setShowCreate(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/demos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] })
      toast.success('Demo updated')
      setEditDemo(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/demos/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] })
      toast.success('Demo deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <FileText className="h-5 w-5" />
              {t('platform.tab.demo')}
            </CardTitle>
            <CardDescription>{demos.length} demos</CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} style={{ background: ORCHID, color: '#fff' }} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {t('platform.tab.demo.create')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
            Loading…
          </div>
        ) : demos.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
            <p className="text-sm italic" style={{ color: JET }}>
              No demos yet. Click <strong>+ Create new Demo</strong> to start.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {demos.map((demo: any) => {
              const isOwner = demo.ownerId === currentUser?.id
              const accessLevel = demo.access?.find((a: any) => a.userId === currentUser?.id)?.accessLevel
              return (
                <div
                  key={demo.id}
                  className="rounded-lg border-2 p-3 flex flex-col"
                  style={{ borderColor: LAVENDER, background: '#fff' }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm flex-1 truncate" style={{ color: JET }}>
                      {demo.name}
                    </div>
                    {demo.status === 'archived' && (
                      <Badge variant="outline" className="text-xs">Archived</Badge>
                    )}
                  </div>
                  {demo.description && (
                    <p className="text-xs mb-2 line-clamp-2" style={{ color: JET, opacity: 0.7 }}>
                      {demo.description}
                    </p>
                  )}
                  <div className="text-xs space-y-0.5 mb-3" style={{ color: JET, opacity: 0.7 }}>
                    <div>Owner: {demo.owner?.name || demo.owner?.email || '—'}</div>
                    <div>{demo._count?.scenarios || 0} scenarios · {demo._count?.access || 0} shared</div>
                    {!isOwner && accessLevel && (
                      <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                        You: {accessLevel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditDemo(demo)
                        setEditForm({ name: demo.name, description: demo.description || '', status: demo.status })
                      }}
                      title="Edit"
                      className="h-8 w-8 p-0"
                      style={{ color: ORCHID }}
                      disabled={!isOwner && currentUser?.role !== 'super_admin'}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {(isOwner || currentUser?.role === 'super_admin') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Delete demo "${demo.name}"? Scenarios will keep their data but lose the demo association.`)) {
                            deleteMut.mutate(demo.id)
                          }
                        }}
                        title="Delete"
                        className="h-8 w-8 p-0"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Create Demo dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>{t('platform.tab.demo.create')}</DialogTitle>
            <DialogDescription>
              A Demo is the top-level container. Each Demo can have multiple Scenarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Acme Inc. Q4 demo"
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description of the demo (optional)"
                rows={3}
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !createForm.name.trim()}
              style={{ background: ORCHID, color: '#fff' }}
            >
              {createMut.isPending ? 'Creating…' : 'Create Demo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Demo dialog */}
      <Dialog open={!!editDemo} onOpenChange={(open) => !open && setEditDemo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>Edit Demo</DialogTitle>
            <DialogDescription>{editDemo?.owner?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Name</Label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Description</Label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDemo(null)}>Cancel</Button>
            <Button
              onClick={() => editDemo && updateMut.mutate(editDemo.id)}
              disabled={updateMut.isPending}
              style={{ background: ORCHID, color: '#fff' }}
            >
              {updateMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
