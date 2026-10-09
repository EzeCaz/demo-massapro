'use client'

// StatusBadge — MassaPro platform shared status badge component.
//
// Implements the 6-slot reserved status color system described in the
// Reporting Best Practices Playbook (Rule #12 of the 14-rule acceptance
// checklist). The defining principle: one status, one badge, one
// definition — surfaces consume this component, they do not restyle the
// concept.
//
// Reserved hue slots (per the Best Practices Playbook §7 "Status Visualization System"):
//   draft / pending   → zinc (neutral, awaiting action)
//   approved / ok     → emerald (cleared)
//   scheduled         → sky (holding future)
//   in-progress       → amber (transient, in-flight)
//   published / live  → purple (live on platform)
//   failed / blocked  → red (terminal failure)
//
// MassaPro brand: orchid purple (#9333EA) is reserved as the platform color,
// so we extend the purple slot to include it for "live" content.

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusKind =
  | 'draft' | 'pending'
  | 'approved' | 'ok' | 'completed'
  | 'scheduled' | 'submitted'
  | 'in-progress' | 'in_progress' | 'publishing'
  | 'published' | 'live' | 'approved-sow'
  | 'failed' | 'blocked' | 'rejected'
  | 'resolved' | 'closed' | 'open'

const SLOT: Record<string, { bg: string; text: string; border: string; label: string }> = {
  // zinc slot — neutral / awaiting
  draft:      { bg: '#F4F4F5', text: '#52525B', border: '#D4D4D8', label: 'Draft' },
  pending:    { bg: '#F4F4F5', text: '#52525B', border: '#D4D4D8', label: 'Pending' },
  open:       { bg: '#F4F4F5', text: '#52525B', border: '#D4D4D8', label: 'Open' },
  // emerald slot — cleared / ok
  approved:   { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'Approved' },
  ok:         { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'OK' },
  completed:  { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'Completed' },
  resolved:   { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'Resolved' },
  // sky slot — holding future
  scheduled:  { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD', label: 'Scheduled' },
  submitted:  { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD', label: 'Submitted' },
  // amber slot — transient in-flight
  'in-progress':  { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'In Progress' },
  in_progress:    { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'In Progress' },
  publishing:     { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'Publishing' },
  // purple slot — live on platform
  published:  { bg: '#F3E8FF', text: '#6B21A8', border: '#C084FC', label: 'Published' },
  live:       { bg: '#F3E8FF', text: '#6B21A8', border: '#C084FC', label: 'Live' },
  closed:     { bg: '#F3E8FF', text: '#6B21A8', border: '#C084FC', label: 'Closed' },
  // red slot — terminal failure
  failed:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Failed' },
  blocked:    { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Blocked' },
  rejected:   { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Rejected' },
}

const SLOT_FALLBACK = { bg: '#F4F4F5', text: '#52525B', border: '#D4D4D8', label: 'Unknown' }

function resolveSlot(status: string) {
  const key = status?.toLowerCase().replace(/[\s-]+/g, '-') || ''
  return SLOT[key] || { ...SLOT_FALLBACK, label: status || 'Unknown' }
}

export function StatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const slot = resolveSlot(status)
  return (
    <Badge
      variant="outline"
      aria-label={`Status: ${slot.label}`}
      className={cn(
        'font-semibold capitalize',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        className,
      )}
      style={{
        background: slot.bg,
        color: slot.text,
        borderColor: slot.border,
      }}
    >
      {slot.label}
    </Badge>
  )
}

// StatusDot — a small color-only indicator (4px left border equivalent in CSS)
// for list rows that don't have room for a full badge but still need to
// communicate status visually. Always paired with text elsewhere on the row.
export function StatusDot({ status, className }: { status: string; className?: string }) {
  const slot = resolveSlot(status)
  return (
    <span
      aria-hidden
      className={cn('inline-block h-2 w-2 rounded-full', className)}
      style={{ background: slot.border }}
    />
  )
}

// STATUS_COLORS — export the resolved colors for chart fill mapping.
// Charts should use these colors so the chart and badge remain consistent
// (Rule #12: surfaces consume the component, they do not restyle the concept).
export const STATUS_COLORS: Record<string, string> = {
  draft: '#A1A1AA',
  pending: '#A1A1AA',
  open: '#A1A1AA',
  approved: '#10B981',
  ok: '#10B981',
  completed: '#10B981',
  resolved: '#10B981',
  scheduled: '#3B82F6',
  submitted: '#3B82F6',
  'in-progress': '#F59E0B',
  in_progress: '#F59E0B',
  publishing: '#F59E0B',
  published: '#9333EA',
  live: '#9333EA',
  closed: '#9333EA',
  failed: '#EF4444',
  blocked: '#EF4444',
  rejected: '#EF4444',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  open: 'Open',
  approved: 'Approved',
  ok: 'OK',
  completed: 'Completed',
  resolved: 'Resolved',
  scheduled: 'Scheduled',
  submitted: 'Submitted',
  'in-progress': 'In Progress',
  in_progress: 'In Progress',
  publishing: 'Publishing',
  published: 'Published',
  live: 'Live',
  closed: 'Closed',
  failed: 'Failed',
  blocked: 'Blocked',
  rejected: 'Rejected',
}

// Friendly display label for any status string.
export function statusLabel(status: string): string {
  const key = status?.toLowerCase().replace(/[\s-]+/g, '-') || ''
  return STATUS_LABEL[key] || status
}
