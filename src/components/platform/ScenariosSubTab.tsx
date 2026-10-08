'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, ListChecks, Loader2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// ScenariosSubTab — embeds the existing DemoDashboard (the scenarios
// table) which already enforces per-user visibility (admins see all;
// regular users see own + collaborations + scenarios in Demos they can
// access — see /api/scenarios GET for the new visibility rule).
//
// Above the table: a "+ Create new Scenario" button that opens a naming
// dialog with a Demo selector. The new scenario is created with the
// selected demoId.
const DemoDashboard = dynamic(() => import('@/components/DemoDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground">Loading scenarios…</div>
    </div>
  ),
})

export default function ScenariosSubTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUser = session?.user as any

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', demoId: '' })

  // Load demos for the dropdown (only ones the user can see + write/edit)
  const { data: demosData } = useQuery({
    queryKey: ['demos'],
    queryFn: async () => {
      const res = await fetch('/api/demos')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const demos = (demosData?.demos || []).filter((d: any) => {
    // Only show demos the user can edit (owner or has access level edit)
    if (d.ownerId === currentUser?.id) return true
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') return true
    return d.access?.some((a: any) => a.userId === currentUser?.id && a.accessLevel === 'edit')
  })

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          demoId: createForm.demoId || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      toast.success('Scenario created')
      setCreateForm({ name: '', demoId: '' })
      setShowCreate(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
              <ListChecks className="h-5 w-5" />
              {t('platform.tab.scenarios')}
            </CardTitle>
            <CardDescription>Scenarios across all demos you can access</CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} style={{ background: ORCHID, color: '#fff' }} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {t('platform.tab.scenarios.create')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <DemoDashboard />
      </CardContent>

      {/* Create Scenario dialog with Demo selector */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>{t('platform.tab.scenarios.create')}</DialogTitle>
            <DialogDescription>
              A Scenario belongs to a Demo. Pick the Demo container, then name your scenario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Demo</Label>
              <Select
                value={createForm.demoId || 'none'}
                onValueChange={(v) => setCreateForm({ ...createForm, demoId: v === 'none' ? '' : v })}
              >
                <SelectTrigger style={{ borderColor: LAVENDER }}>
                  <SelectValue placeholder="Pick a demo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No demo (legacy / unassigned)</SelectItem>
                  {demos.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {demos.length === 0 && (
                <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>
                  No demos available — create one in the Demo tab first.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase" style={{ color: JET }}>Scenario name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Acme Outbound Sales Demo"
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
              {createMut.isPending ? 'Creating…' : 'Create Scenario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
