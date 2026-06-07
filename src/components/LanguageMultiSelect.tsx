'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { X, ChevronDown, Check } from 'lucide-react'

// The 16 supported languages
export const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Arabic',
  'Hebrew',
  'Chinese',
  'Japanese',
  'Korean',
  'Hindi',
  'Russian',
  'Dutch',
  'Turkish',
  'Polish',
  'Swedish',
] as const

export type Language = (typeof LANGUAGES)[number]

interface LanguageMultiSelectProps {
  value: string // comma-separated language names from DB
  onChange: (value: string) => void // passes back comma-separated string
  placeholder?: string
}

/**
 * Parses the stored value into a language array.
 * Handles both "English, Spanish" and "English; Spanish" formats.
 */
export function parseLanguages(raw: string): Language[] {
  if (!raw) return []
  return raw
    .split(/[,;]/)
    .map(l => l.trim())
    .filter((l): l is Language => (LANGUAGES as readonly string[]).includes(l))
}

/**
 * Serializes a language array back to comma-separated string.
 */
export function serializeLanguages(langs: Language[]): string {
  return langs.join(', ')
}

export default function LanguageMultiSelect({
  value,
  onChange,
  placeholder = 'Select languages...',
}: LanguageMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected: Language[] = parseLanguages(value)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggleLanguage = (lang: Language) => {
    const next = selected.includes(lang)
      ? selected.filter(l => l !== lang)
      : [...selected, lang]
    onChange(serializeLanguages(next))
  }

  const removeLanguage = (lang: Language) => {
    const next = selected.filter(l => l !== lang)
    onChange(serializeLanguages(next))
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        className={`flex items-center flex-wrap gap-1 min-h-[38px] px-3 py-1.5 border rounded-md cursor-text bg-background transition-colors ${
          open ? 'border-vivid-blue ring-1 ring-vivid-blue/30' : 'hover:border-muted-foreground/50'
        }`}
        onClick={() => setOpen(true)}
      >
        {selected.length > 0 ? (
          selected.map(lang => (
            <Badge
              key={lang}
              variant="secondary"
              className="text-xs gap-0.5 pr-1 bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
            >
              {lang}
              <button
                type="button"
                className="ml-0.5 rounded-full hover:bg-vivid-blue/20 p-0.5"
                onClick={e => {
                  e.stopPropagation()
                  removeLanguage(lang)
                }}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground flex-shrink-0" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {LANGUAGES.map(lang => {
            const isSelected = selected.includes(lang)
            return (
              <div
                key={lang}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-vivid-blue/10 text-vivid-blue font-medium'
                    : 'hover:bg-muted'
                }`}
                onClick={() => toggleLanguage(lang)}
              >
                <div
                  className={`flex items-center justify-center h-4 w-4 rounded border flex-shrink-0 ${
                    isSelected
                      ? 'bg-vivid-blue border-vivid-blue text-white'
                      : 'border-muted-foreground/40'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                {lang}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
