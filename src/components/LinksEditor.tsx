'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ExternalLink } from 'lucide-react'

export interface LinkEntry {
  url: string
  name: string
  description: string
}

interface LinksEditorProps {
  links: LinkEntry[]
  onChange: (links: LinkEntry[]) => void
  /**
   * When true, render as a compact layout (no Card wrapper) for embedding
   * inside a Dialog. When false, render with a Card wrapper for use inside
   * a full page form.
   */
  compact?: boolean
}

/**
 * Reusable editor for a list of external URL links.
 * Each link has: URL, Name, Short description.
 * Users can click "+" to add more links.
 */
export default function LinksEditor({ links, onChange, compact = false }: LinksEditorProps) {
  const addLink = () => {
    onChange([...links, { url: '', name: '', description: '' }])
  }

  const updateLink = (index: number, field: keyof LinkEntry, value: string) => {
    const updated = [...links]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index))
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          External URL Links
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLink}
          className="h-7 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No external links added. Click &quot;Add Link&quot; to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => (
            <div
              key={index}
              className={`rounded-lg border border-input bg-background p-3 space-y-2 ${compact ? '' : 'shadow-sm'}`}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={link.name}
                  onChange={e => updateLink(index, 'name', e.target.value)}
                  placeholder="Link name (e.g., Company Website)"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLink(index)}
                  className="text-destructive hover:text-destructive h-8 px-2"
                  title="Remove link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                type="url"
                value={link.url}
                onChange={e => updateLink(index, 'url', e.target.value)}
                placeholder="https://example.com"
                className="h-8 text-sm"
              />
              <Textarea
                value={link.description}
                onChange={e => updateLink(index, 'description', e.target.value)}
                placeholder="Short description (optional)"
                className="min-h-[40px] text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
