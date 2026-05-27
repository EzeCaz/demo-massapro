'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import {
  ChevronDown, ChevronRight, Pencil, Trash2, Check, X, Plus,
  Users, FileText, Mail, Copy, Loader2, Search, Languages,
  StickyNote, Download, Eye, Filter, Shield, Crown,
} from 'lucide-react'
import ScenarioForm from './ScenarioForm'
import CollaboratorPanel from './CollaboratorPanel'
import CommentsPanel from './CommentsPanel'
import ChangeLogPanel from './ChangeLogPanel'
import AdminNotesPanel from './AdminNotesPanel'
import TranslationPanel from './TranslationPanel'

export default function AdminPanel() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUserRole = (session?.user as any)?.role
  const isSuperAdmin = currentUserRole === 'super_admin'

  // Client management state
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', company: '', role: '' })

  // Invite state
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', company: '', password: '', role: 'user' })
  const [inviteResult, setInviteResult] = useState<any>(null)

  // Scenario filters
  const [filterClient, setFilterClient] = useState('all')
  const [filterCompany, setFilterCompany] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected scenario for detail view
  const [selectedScenario, setSelectedScenario] = useState<any>(null)
  const [detailTab, setDetailTab] = useState('form')

  // Admin note form
  const [noteForm, setNoteForm] = useState({ scenarioId: '', clientId: '', note: '' })
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const res = await fetch('/api/admin/clients')
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json()
    },
  })

  // Fetch all scenarios
  const { data: allScenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ['admin-scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/admin/scenarios')
      if (!res.ok) throw new Error('Failed to fetch scenarios')
      return res.json()
    },
  })

  // Fetch invites
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: async () => {
      const res = await fetch('/api/admin/invites')
      if (!res.ok) throw new Error('Failed to fetch invites')
      return res.json()
    },
  })

  // Fetch single scenario detail
  const { data: scenarioDetail } = useQuery({
    queryKey: ['scenario-detail', selectedScenario?.id],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${selectedScenario.id}`)
      if (!res.ok) throw new Error('Failed to fetch scenario')
      return res.json()
    },
    enabled: !!selectedScenario?.id,
  })

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: { userId: string; name: string; email: string; company: string; role?: string }) => {
      const res = await fetch('/api/admin/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update client')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Client updated')
      setEditingClientId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: () => toast.error('Failed to update client'),
  })

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/clients?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete client')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Client deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: () => toast.error('Failed to delete client'),
  })

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create invite')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Invite created!')
      setInviteResult(data)
      setInviteForm({ email: '', name: '', company: '', password: '', role: 'user' })
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] })
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: () => toast.error('Failed to create invite'),
  })

  // Admin note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (data: { scenarioId: string; clientId: string; note: string }) => {
      const res = await fetch(`/api/scenarios/${data.scenarioId}/admin-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to add note')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Note sent to client!')
      setNoteDialogOpen(false)
      setNoteForm({ scenarioId: '', clientId: '', note: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-scenarios'] })
    },
    onError: () => toast.error('Failed to send note'),
  })

  const startEditClient = (client: any) => {
    setEditingClientId(client.id)
    setEditForm({ name: client.name || '', email: client.email, company: client.company || '', role: client.role || 'user' })
  }

  const saveEditClient = () => {
    if (editingClientId) {
      updateClientMutation.mutate({ userId: editingClientId, ...editForm })
    }
  }

  const copyCredentials = (credentials: any) => {
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}\nLogin URL: ${window.location.origin}`
    navigator.clipboard.writeText(text)
    toast.success('Credentials copied to clipboard!')
  }

  // Filter and sort scenarios
  const filteredScenarios = allScenarios
    .filter((s: any) => {
      if (filterClient !== 'all' && s.clientId !== filterClient) return false
      if (filterCompany !== 'all' && s.client?.company !== filterCompany) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          s.name.toLowerCase().includes(q) ||
          s.client?.name?.toLowerCase().includes(q) ||
          s.client?.company?.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'updatedAt') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  // Get unique companies
  const companies = [...new Set(clients.map((c: any) => c.company).filter(Boolean))]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            {t('admin.clients')}
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 sm:mr-2" />
            {t('admin.scenarios')}
          </TabsTrigger>
          <TabsTrigger value="invites" className="text-xs sm:text-sm">
            <Mail className="h-4 w-4 mr-1 sm:mr-2" />
            {t('admin.invites')}
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs sm:text-sm">
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            {t('admin.export')}
          </TabsTrigger>
        </TabsList>

        {/* CLIENTS TAB */}
        <TabsContent value="clients" className="mt-4">
          {isSuperAdmin && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Super Admin Access</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">You can create and manage admin users, change user roles, and manage all accounts.</p>
            </div>
          )}
          {clientsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-vivid-blue" />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('general.noData')}</p>
          ) : (
            <div className="space-y-3">
              {/* Group by company */}
              {companies.map(company => {
                const companyClients = clients.filter((c: any) => c.company === company)
                return (
                  <Collapsible key={company} defaultOpen>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80">
                        <ChevronDown className="h-4 w-4" />
                        <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{company}</span>
                        <Badge variant="secondary" className="text-xs">{companyClients.length}</Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2 pl-4">
                        {companyClients.map((client: any) => (
                          <ClientRow
                            key={client.id}
                            client={client}
                            editingId={editingClientId}
                            editForm={editForm}
                            onStartEdit={startEditClient}
                            onSaveEdit={saveEditClient}
                            onCancelEdit={() => setEditingClientId(null)}
                            onEditFormChange={setEditForm}
                            onDelete={() => deleteClientMutation.mutate(client.id)}
                            saving={updateClientMutation.isPending}
                            isSuperAdmin={isSuperAdmin}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}

              {/* Clients without company */}
              {clients.filter((c: any) => !c.company).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">No Company</p>
                  {clients.filter((c: any) => !c.company).map((client: any) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      editingId={editingClientId}
                      editForm={editForm}
                      onStartEdit={startEditClient}
                      onSaveEdit={saveEditClient}
                      onCancelEdit={() => setEditingClientId(null)}
                      onEditFormChange={setEditForm}
                      onDelete={() => deleteClientMutation.mutate(client.id)}
                      saving={updateClientMutation.isPending}
                      isSuperAdmin={isSuperAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* SCENARIOS TAB */}
        <TabsContent value="scenarios" className="mt-4">
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('general.search')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterClient} onValueChange={setFilterClient}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.filterClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('general.all')} Clients</SelectItem>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterCompany} onValueChange={setFilterCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.filterCompany')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('general.all')} Companies</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.filterStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('general.all')}</SelectItem>
                      <SelectItem value="draft">{t('dashboard.draft')}</SelectItem>
                      <SelectItem value="submitted">{t('dashboard.submitted')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updatedAt">{t('admin.lastModified')}</SelectItem>
                      <SelectItem value="createdAt">{t('admin.createdDate')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Scenario List */}
            {scenariosLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-vivid-blue" />
              </div>
            ) : filteredScenarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('general.noData')}</p>
            ) : (
              <div className="space-y-2">
                {filteredScenarios.map((scenario: any) => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{scenario.name}</span>
                        <Badge
                          variant={scenario.status === 'submitted' ? 'default' : 'secondary'}
                          className={`text-xs ${scenario.status === 'submitted' ? 'bg-emerald text-white' : ''}`}
                        >
                          {scenario.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {scenario.client?.name || scenario.client?.email}
                        </span>
                        {scenario.client?.company && (
                          <Badge variant="outline" className="text-[10px] px-1">
                            {scenario.client.company}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Updated: {new Date(scenario.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedScenario(scenario)
                          setDetailTab('form')
                        }}
                        title={t('admin.viewScenario')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          setNoteForm({
                            scenarioId: scenario.id,
                            clientId: scenario.clientId,
                            note: '',
                          })
                          setNoteDialogOpen(true)
                        }}
                        title={t('admin.addNote')}
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scenario Detail Modal */}
            <Dialog open={!!selectedScenario} onOpenChange={() => setSelectedScenario(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedScenario?.name || 'Scenario Detail'}
                  </DialogTitle>
                </DialogHeader>
                {scenarioDetail && (
                  <Tabs value={detailTab} onValueChange={setDetailTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="form" className="text-xs">Form</TabsTrigger>
                      <TabsTrigger value="collaborators" className="text-xs">{t('tab.collaborators')}</TabsTrigger>
                      <TabsTrigger value="comments" className="text-xs">{t('tab.comments')}</TabsTrigger>
                      <TabsTrigger value="changelog" className="text-xs">{t('tab.changeHistory')}</TabsTrigger>
                      <TabsTrigger value="notes" className="text-xs">{t('tab.adminNotes')}</TabsTrigger>
                      <TabsTrigger value="translate" className="text-xs">{t('translate.title')}</TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                      <TabsContent value="form">
                        <ScenarioForm scenario={scenarioDetail} userRole="admin" />
                      </TabsContent>
                      <TabsContent value="collaborators">
                        <CollaboratorPanel scenarioId={scenarioDetail.id} />
                      </TabsContent>
                      <TabsContent value="comments">
                        <CommentsPanel scenarioId={scenarioDetail.id} />
                      </TabsContent>
                      <TabsContent value="changelog">
                        <ChangeLogPanel scenarioId={scenarioDetail.id} />
                      </TabsContent>
                      <TabsContent value="notes">
                        <AdminNotesPanel scenarioId={scenarioDetail.id} />
                      </TabsContent>
                      <TabsContent value="translate">
                        <TranslationPanel scenarioId={scenarioDetail.id} scenario={scenarioDetail} />
                      </TabsContent>
                    </div>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>

            {/* Add Note Dialog */}
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('admin.addNote')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Textarea
                    value={noteForm.note}
                    onChange={e => setNoteForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder={t('adminNotes.placeholder')}
                    className="min-h-[100px]"
                  />
                  <Button
                    onClick={() => addNoteMutation.mutate(noteForm)}
                    disabled={addNoteMutation.isPending}
                    className="w-full bg-vivid-blue hover:bg-blue-700"
                  >
                    {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {t('adminNotes.send')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* INVITES TAB */}
        <TabsContent value="invites" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Invite */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('admin.createInvite')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">{t('admin.inviteEmail')}</Label>
                  <Input
                    value={inviteForm.email}
                    onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('admin.inviteName')}</Label>
                  <Input
                    value={inviteForm.name}
                    onChange={e => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('admin.inviteCompany')}</Label>
                  <Input
                    value={inviteForm.company}
                    onChange={e => setInviteForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('admin.invitePassword')}</Label>
                  <Input
                    value={inviteForm.password}
                    onChange={e => setInviteForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="(auto-generated if empty)"
                  />
                </div>
                {/* Role selection - only super_admin can create admins */}
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label className="text-sm">Role</Label>
                    <Select value={inviteForm.role} onValueChange={value => setInviteForm(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Admins can access the admin panel and manage scenarios.</p>
                  </div>
                )}
                <Button
                  onClick={() => createInviteMutation.mutate(inviteForm)}
                  disabled={createInviteMutation.isPending}
                  className="w-full bg-vivid-blue hover:bg-blue-700"
                >
                  {createInviteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  {t('admin.generateInvite')}
                </Button>

                {/* Invite Result */}
                {inviteResult && (
                  <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Credentials:</p>
                    <div className="text-sm space-y-1">
                      <p>Email: <span className="font-mono">{inviteResult.credentials.email}</span></p>
                      <p>Password: <span className="font-mono">{inviteResult.credentials.password}</span></p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCredentials(inviteResult.credentials)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {t('admin.copyCredentials')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invite List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite History</CardTitle>
              </CardHeader>
              <CardContent>
                {invitesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('general.noData')}</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {invites.map((invite: any) => (
                      <div key={invite.id} className="p-2 border rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{invite.email}</span>
                          <Badge variant={invite.usedAt ? 'default' : 'secondary'} className="text-xs">
                            {invite.usedAt ? 'Used' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {invite.name && <span>{invite.name} · </span>}
                          {invite.company && <span>{invite.company} · </span>}
                          <span>Expires: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* EXPORT TAB */}
        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.export')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={() => window.open('/api/admin/export?format=csv', '_blank')}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('export.csv')} - All Scenarios
              </Button>
              {clients.map((client: any) => (
                <Button
                  key={client.id}
                  variant="outline"
                  onClick={() => window.open(`/api/admin/export?clientId=${client.id}&format=csv`, '_blank')}
                  className="w-full justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('export.csv')} - {client.name || client.email}
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Client Row Component
function ClientRow({
  client,
  editingId,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditFormChange,
  onDelete,
  saving,
  isSuperAdmin,
}: {
  client: any
  editingId: string | null
  editForm: { name: string; email: string; company: string; role: string }
  onStartEdit: (client: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditFormChange: (form: { name: string; email: string; company: string; role: string }) => void
  onDelete: () => void
  saving: boolean
  isSuperAdmin: boolean
}) {
  const isEditing = editingId === client.id
  const isSuperAdminUser = client.role === 'super_admin'
  const isAdminUser = client.role === 'admin'

  // Super admin users cannot be edited or deleted
  // Admin users can only be edited/deleted by super_admin
  const canEdit = !isSuperAdminUser && (isSuperAdmin || !isAdminUser)
  const canDelete = !isSuperAdminUser && (isSuperAdmin || !isAdminUser)

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md">
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <Input
            value={editForm.name}
            onChange={e => onEditFormChange({ ...editForm, name: e.target.value })}
            placeholder="Name"
            className="w-32 h-8 text-sm"
          />
          <Input
            value={editForm.email}
            onChange={e => onEditFormChange({ ...editForm, email: e.target.value })}
            placeholder="Email"
            className="w-44 h-8 text-sm"
          />
          <Input
            value={editForm.company}
            onChange={e => onEditFormChange({ ...editForm, company: e.target.value })}
            placeholder="Company"
            className="w-32 h-8 text-sm"
          />
          {/* Role dropdown for super_admin only */}
          {isSuperAdmin && (
            <Select value={editForm.role} onValueChange={value => onEditFormChange({ ...editForm, role: value })}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={onSaveEdit} disabled={saving} className="h-7 w-7 p-0">
            <Check className="h-4 w-4 text-emerald" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancelEdit} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{client.name || 'Unnamed'}</span>
              <span className="text-xs text-muted-foreground">{client.email}</span>
              <RoleBadge role={client.role} />
              <Badge variant="outline" className="text-[10px]">
                {client._count?.scenarios || 0} scenarios
              </Badge>
            </div>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => onStartEdit(client)} className="h-7">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (confirm('Are you sure?')) onDelete() }}
              className="h-7 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  )
}

// Role Badge Component
function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') {
    return (
      <Badge className="text-[10px] bg-amber-500 text-white gap-0.5">
        <Crown className="h-2.5 w-2.5" />
        Super Admin
      </Badge>
    )
  }
  if (role === 'admin') {
    return (
      <Badge className="text-[10px] bg-vivid-blue text-white gap-0.5">
        <Shield className="h-2.5 w-2.5" />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-[10px]">
      User
    </Badge>
  )
}
