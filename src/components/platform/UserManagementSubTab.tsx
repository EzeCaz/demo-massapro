'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Users, Building2, UserCog, Search, Check, X, Plus, Pencil, Trash2, UserCheck,
  Ban, RefreshCw, Loader2,
} from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  company: string | null
  companyId: string | null
  teamId: string | null
  jobTitle: string | null
  phone: string | null
  linkedinUrl: string | null
  country: string | null
  city: string | null
  avatarUrl: string | null
  bio: string | null
  status: string
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  companyRef: { id: string; name: string } | null
  teamRef: { id: string; name: string } | null
}

// UserManagementSubTab — super_admin only on mutations; admins can read.
//
// Three sections:
//   1) Users table — search, filter by status, edit (dialog), approve,
//      suspend, reactivate, delete
//   2) Companies — list, add, edit, archive
//   3) Teams — list, add, edit, archive (per company)
export default function UserManagementSubTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  // ---- Queries: users + companies + teams --------------------------------
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', filterStatus],
    queryFn: async () => {
      const url = filterStatus === 'all' ? '/api/users' : `/api/users?status=${filterStatus}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error('Failed to load companies')
      return res.json()
    },
  })
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to load teams')
      return res.json()
    },
  })

  const users = usersData?.users || []
  const companies = companiesData?.companies || []
  const teams = teamsData?.teams || []

  // ---- Filter users by search -------------------------------------------
  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return users
    return users.filter((u: UserRow) =>
      (u.name || '').toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
    )
  }, [users, search])

  // ---- Mutations ----------------------------------------------------------
  const patchUser = useMutation({
    mutationFn: async ({ id, body, action }: { id: string; body?: any; action?: string }) => {
      const url = action ? `/api/users?id=${id}&action=${action}` : `/api/users?id=${id}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditUser(null)
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  // ---- Open edit dialog --------------------------------------------------
  const openEdit = (u: UserRow) => {
    setEditUser(u)
    setEditForm({
      name: u.name || '',
      role: u.role,
      companyId: u.companyId || '',
      teamId: u.teamId || '',
      jobTitle: u.jobTitle || '',
      phone: u.phone || '',
      linkedinUrl: u.linkedinUrl || '',
      country: u.country || '',
      city: u.city || '',
      bio: u.bio || '',
    })
  }

  const saveEdit = () => {
    if (!editUser) return
    patchUser.mutate({ id: editUser.id, body: editForm })
  }

  // ---- Filter teams dropdown to the user's selected company -------------
  const filteredTeams = useMemo(() => {
    if (!editForm.companyId) return []
    return teams.filter((tm: any) => tm.companyId === editForm.companyId && tm.status === 'active')
  }, [teams, editForm.companyId])

  // ---- Status badge helper ----------------------------------------------
  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; bg: string }> = {
      active: { color: '#10B981', bg: '#D1FAE5' },
      pending: { color: '#F59E0B', bg: '#FEF3C7' },
      suspended: { color: '#EF4444', bg: '#FEE2E2' },
      deleted: { color: '#6B7280', bg: '#F3F4F6' },
    }
    const m = map[status] || map.active
    return (
      <Badge variant="outline" className="text-xs" style={{ borderColor: m.color, color: m.color, background: m.bg }}>
        {t(`admin.users.status.${status}`)}
      </Badge>
    )
  }

  // ---- Render -------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2" style={{ color: ORCHID }}>
          <Users className="h-5 w-5" />
          {t('admin.users.title')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.users.subtitle')}</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="text-xs">
            <Users className="h-4 w-4 mr-1.5" /> {t('admin.users.title')}
          </TabsTrigger>
          <TabsTrigger value="companies" className="text-xs">
            <Building2 className="h-4 w-4 mr-1.5" /> {t('admin.companies.title')}
          </TabsTrigger>
          <TabsTrigger value="teams" className="text-xs">
            <UserCog className="h-4 w-4 mr-1.5" /> {t('admin.teams.title')}
          </TabsTrigger>
        </TabsList>

        {/* ===== Users ===== */}
        <TabsContent value="users" className="focus-visible:outline-none">
          <Card style={{ borderColor: LAVENDER }}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle style={{ color: ORCHID }}>{t('admin.users.title')}</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t('admin.users.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 max-w-xs"
                    style={{ borderColor: LAVENDER }}
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 w-36" style={{ borderColor: LAVENDER }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('general.all')}</SelectItem>
                      <SelectItem value="active">{t('admin.users.status.active')}</SelectItem>
                      <SelectItem value="pending">{t('admin.users.status.pending')}</SelectItem>
                      <SelectItem value="suspended">{t('admin.users.status.suspended')}</SelectItem>
                      <SelectItem value="deleted">{t('admin.users.status.deleted')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                  Loading…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
                  <p className="text-sm italic" style={{ color: JET }}>{t('admin.users.empty')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide" style={{ color: JET, opacity: 0.7 }}>
                        <th className="text-start p-2 font-semibold">{t('admin.users.name')}</th>
                        <th className="text-start p-2 font-semibold">{t('admin.users.email')}</th>
                        <th className="text-start p-2 font-semibold">{t('admin.users.role')}</th>
                        <th className="text-start p-2 font-semibold">{t('admin.users.company')}</th>
                        <th className="text-start p-2 font-semibold">{t('admin.users.team')}</th>
                        <th className="text-start p-2 font-semibold">Status</th>
                        <th className="text-end p-2 font-semibold">{t('admin.users.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: UserRow) => (
                        <tr key={u.id} className="border-t" style={{ borderColor: LAVENDER }}>
                          <td className="p-2 font-medium" style={{ color: JET }}>{u.name || '—'}</td>
                          <td className="p-2" style={{ color: JET }}>{u.email}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                              {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'demo' ? 'Demo' : 'User'}
                            </Badge>
                          </td>
                          <td className="p-2" style={{ color: JET }}>{u.companyRef?.name || (u.company || '—')}</td>
                          <td className="p-2" style={{ color: JET }}>{u.teamRef?.name || '—'}</td>
                          <td className="p-2">{statusBadge(u.status)}</td>
                          <td className="p-2">
                            <div className="flex items-center justify-end gap-1">
                              {isSuperAdmin && u.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => patchUser.mutate({ id: u.id, action: 'approve' })}
                                  title={t('admin.users.approve')}
                                  className="h-8 w-8 p-0"
                                  style={{ color: '#10B981' }}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              {isSuperAdmin && u.status === 'active' && u.role !== 'super_admin' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => patchUser.mutate({ id: u.id, action: 'suspend' })}
                                  title={t('admin.users.suspend')}
                                  className="h-8 w-8 p-0"
                                  style={{ color: '#F59E0B' }}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              {isSuperAdmin && u.status === 'suspended' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => patchUser.mutate({ id: u.id, action: 'reactivate' })}
                                  title={t('admin.users.reactivate')}
                                  className="h-8 w-8 p-0"
                                  style={{ color: '#10B981' }}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              {isSuperAdmin && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEdit(u)}
                                    title={t('admin.users.editUser')}
                                    className="h-8 w-8 p-0"
                                    style={{ color: ORCHID }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {u.role !== 'super_admin' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        if (window.confirm(`Delete user ${u.email}? This cannot be undone.`)) {
                                          deleteUser.mutate(u.id)
                                        }
                                      }}
                                      title={t('admin.users.deleteUser')}
                                      className="h-8 w-8 p-0"
                                      style={{ color: '#EF4444' }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Companies ===== */}
        <TabsContent value="companies" className="focus-visible:outline-none">
          <CompaniesPanel companies={companies} isSuperAdmin={isSuperAdmin} />
        </TabsContent>

        {/* ===== Teams ===== */}
        <TabsContent value="teams" className="focus-visible:outline-none">
          <TeamsPanel teams={teams} companies={companies} isSuperAdmin={isSuperAdmin} />
        </TabsContent>
      </Tabs>

      {/* ===== Edit user dialog ===== */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: ORCHID }}>{t('admin.users.editUser')}</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.name')}</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.role')}</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger style={{ borderColor: LAVENDER }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.company')}</Label>
                  <Select
                    value={editForm.companyId || 'none'}
                    onValueChange={(v) => setEditForm({ ...editForm, companyId: v === 'none' ? '' : v, teamId: '' })}
                  >
                    <SelectTrigger style={{ borderColor: LAVENDER }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin.users.noCompany')}</SelectItem>
                      {companies.filter((c: any) => c.status === 'active').map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.team')}</Label>
                  <Select
                    value={editForm.teamId || 'none'}
                    onValueChange={(v) => setEditForm({ ...editForm, teamId: v === 'none' ? '' : v })}
                    disabled={!editForm.companyId}
                  >
                    <SelectTrigger style={{ borderColor: LAVENDER }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin.users.noTeam')}</SelectItem>
                      {filteredTeams.map((tm: any) => (
                        <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.jobTitle')}</Label>
                  <Input
                    value={editForm.jobTitle}
                    onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.phone')}</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.linkedin')}</Label>
                  <Input
                    value={editForm.linkedinUrl}
                    onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.country')}</Label>
                  <Input
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.city')}</Label>
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.users.bio')}</Label>
                  <Input
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    style={{ borderColor: LAVENDER }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t('general.cancel')}
            </Button>
            <Button onClick={saveEdit} disabled={patchUser.isPending} style={{ background: ORCHID, color: '#fff' }}>
              {patchUser.isPending ? 'Saving…' : t('general.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =========================================================================
// Companies panel — list, add, edit, archive
// =========================================================================
function CompaniesPanel({ companies, isSuperAdmin }: { companies: any[]; isSuperAdmin: boolean }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Company added')
      setForm({ name: '', description: '' })
      setShowAdd(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies?id=${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Company archived')
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle style={{ color: ORCHID }}>{t('admin.companies.title')}</CardTitle>
            <CardDescription>{t('admin.users.subtitle')}</CardDescription>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setShowAdd(true)} style={{ background: ORCHID, color: '#fff' }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {t('admin.companies.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
            <p className="text-sm italic" style={{ color: JET }}>{t('admin.companies.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c: any) => (
              <div
                key={c.id}
                className="rounded-lg border-2 p-3"
                style={{ borderColor: LAVENDER, background: c.status === 'archived' ? '#F9FAFB' : WHITE }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm" style={{ color: JET }}>{c.name}</div>
                  {c.status === 'archived' && <Badge variant="outline" className="text-xs">Archived</Badge>}
                </div>
                {c.description && (
                  <p className="text-xs mt-1" style={{ color: JET, opacity: 0.7 }}>{c.description}</p>
                )}
                <p className="text-xs mt-2" style={{ color: JET, opacity: 0.6 }}>
                  {c._count?.members || 0} {t('admin.companies.members')} · {c._count?.teams || 0} {t('admin.companies.teams')}
                </p>
                {isSuperAdmin && c.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                      if (window.confirm(`Archive "${c.name}"? Members will keep their accounts but lose company association.`)) {
                        archiveMut.mutate(c.id)
                      }
                    }}
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Archive
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: ORCHID }}>{t('admin.companies.add')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.companies.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.companies.description')}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ borderColor: LAVENDER }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>{t('general.cancel')}</Button>
              <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !form.name.trim()} style={{ background: ORCHID, color: '#fff' }}>
                {addMut.isPending ? 'Adding…' : t('admin.companies.add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// =========================================================================
// Teams panel — list, add, edit, archive (per company)
// =========================================================================
function TeamsPanel({ teams, companies, isSuperAdmin }: { teams: any[]; companies: any[]; isSuperAdmin: boolean }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', companyId: '', description: '' })

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team added')
      setForm({ name: '', companyId: '', description: '' })
      setShowAdd(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teams?id=${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team archived')
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle style={{ color: ORCHID }}>{t('admin.teams.title')}</CardTitle>
            <CardDescription>{t('admin.users.subtitle')}</CardDescription>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setShowAdd(true)} style={{ background: ORCHID, color: '#fff' }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {t('admin.teams.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
            <p className="text-sm italic" style={{ color: JET }}>{t('admin.teams.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map((tm: any) => (
              <div
                key={tm.id}
                className="rounded-lg border-2 p-3"
                style={{ borderColor: LAVENDER, background: tm.status === 'archived' ? '#F9FAFB' : WHITE }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm" style={{ color: JET }}>{tm.name}</div>
                  {tm.status === 'archived' && <Badge variant="outline" className="text-xs">Archived</Badge>}
                </div>
                <p className="text-xs mt-1" style={{ color: JET, opacity: 0.7 }}>
                  {t('admin.teams.company')}: {tm.company?.name || '—'}
                </p>
                <p className="text-xs mt-1" style={{ color: JET, opacity: 0.6 }}>
                  {tm._count?.members || 0} {t('admin.companies.members')}
                </p>
                {isSuperAdmin && tm.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                      if (window.confirm(`Archive team "${tm.name}"?`)) {
                        archiveMut.mutate(tm.id)
                      }
                    }}
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Archive
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: ORCHID }}>{t('admin.teams.add')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.teams.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ borderColor: LAVENDER }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.teams.company')}</Label>
                <Select
                  value={form.companyId}
                  onValueChange={(v) => setForm({ ...form, companyId: v })}
                >
                  <SelectTrigger style={{ borderColor: LAVENDER }}>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.filter((c: any) => c.status === 'active').map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase" style={{ color: JET }}>{t('admin.companies.description')}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ borderColor: LAVENDER }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>{t('general.cancel')}</Button>
              <Button
                onClick={() => addMut.mutate()}
                disabled={addMut.isPending || !form.name.trim() || !form.companyId}
                style={{ background: ORCHID, color: '#fff' }}
              >
                {addMut.isPending ? 'Adding…' : t('admin.teams.add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
