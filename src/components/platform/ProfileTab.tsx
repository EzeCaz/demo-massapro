'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Save, User as UserIcon, Mail, Phone, Linkedin, Globe, MapPin, Briefcase, Building2 } from 'lucide-react'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'

// ProfileTab — current user can edit their own profile fields (name, job
// title, phone, LinkedIn URL, country, city, avatar URL, bio). Email and
// role are read-only (changed by admin).
export default function ProfileTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to load profile')
      return res.json()
    },
  })

  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    if (data?.profile) setForm(data.profile)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed to save')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('profile.saved'))
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    saveMutation.mutate({
      name: form.name,
      jobTitle: form.jobTitle,
      phone: form.phone,
      linkedinUrl: form.linkedinUrl,
      country: form.country,
      city: form.city,
      avatarUrl: form.avatarUrl,
      bio: form.bio,
    })
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('general.loading')}
      </div>
    )
  }

  return (
    <Card style={{ borderColor: LAVENDER, maxWidth: '900px' }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
          <UserIcon className="h-5 w-5" />
          {t('profile.title')}
        </CardTitle>
        <CardDescription>{t('profile.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Read-only: email + role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase" style={{ color: JET }}>{t('profile.email')}</Label>
              <Input
                value={form.email || ''}
                disabled
                style={{ borderColor: LAVENDER, opacity: 0.7, background: LAVENDER }}
              />
              <p className="text-xs" style={{ color: JET, opacity: 0.6 }}>{t('profile.emailLocked')}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase" style={{ color: JET }}>{t('profile.role')}</Label>
              <div className="flex items-center gap-2 h-9">
                <Badge variant="outline" className="text-xs" style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}>
                  {form.role === 'super_admin' ? 'Super Admin' : form.role === 'admin' ? 'Admin' : form.role === 'demo' ? 'Demo' : 'User'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Company + team — read-only (admin assigns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase" style={{ color: JET }}>{t('profile.company')}</Label>
              <div className="flex items-center gap-2 h-9 text-sm" style={{ color: JET }}>
                <Building2 className="h-4 w-4" style={{ color: ORCHID }} />
                {form.companyRef?.name || (form.company || t('profile.noCompany'))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase" style={{ color: JET }}>{t('profile.team')}</Label>
              <div className="flex items-center gap-2 h-9 text-sm" style={{ color: JET }}>
                <UserIcon className="h-4 w-4" style={{ color: ORCHID }} />
                {form.teamRef?.name || t('profile.noTeam')}
              </div>
            </div>
          </div>

          {/* Editable: name + job title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs uppercase" style={{ color: JET }}>
                {t('profile.fullName')}
              </Label>
              <Input
                id="name"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="text-xs uppercase" style={{ color: JET }}>
                {t('profile.jobTitle')}
              </Label>
              <Input
                id="jobTitle"
                value={form.jobTitle || ''}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="e.g., Solutions Architect"
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>

          {/* Phone + LinkedIn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs uppercase" style={{ color: JET }}>
                {t('profile.phone')}
              </Label>
              <Input
                id="phone"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 0100"
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl" className="text-xs uppercase" style={{ color: JET }}>
                {t('profile.linkedin')}
              </Label>
              <Input
                id="linkedinUrl"
                value={form.linkedinUrl || ''}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>

          {/* Country + city */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-xs uppercase" style={{ color: JET }}>
                {t('profile.country')}
              </Label>
              <Input
                id="country"
                value={form.country || ''}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="e.g., United States"
                style={{ borderColor: LAVENDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs uppercase" style={{ color: JET }}>
                {t('profile.city')}
              </Label>
              <Input
                id="city"
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g., New York"
                style={{ borderColor: LAVENDER }}
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl" className="text-xs uppercase" style={{ color: JET }}>
              {t('profile.avatar')}
            </Label>
            <Input
              id="avatarUrl"
              value={form.avatarUrl || ''}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              placeholder="https://…"
              style={{ borderColor: LAVENDER }}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs uppercase" style={{ color: JET }}>
              {t('profile.bio')}
            </Label>
            <Textarea
              id="bio"
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell us about yourself…"
              rows={4}
              style={{ borderColor: LAVENDER }}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              style={{ background: ORCHID, color: '#fff' }}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving…' : t('profile.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
