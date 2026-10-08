'use client'

import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileText } from 'lucide-react'
import { useSOWState, SERVICES, brandClean } from './useSOWState'

const ORCHID = '#9333EA'
const JET = '#030712'
const LAVENDER = '#F3E8FF'
const WHITE = '#FFFFFF'

// SOWSpecsSubTab — renders just the tech-specs panel of the SOW Builder.
// Reads/writes the same localStorage state as /sow, so any change here is
// immediately visible there (and in the Word export).
export default function SOWSpecsSubTab() {
  const { t } = useLanguage()
  const { allServices, state, updateSpecValue, hydrated } = useSOWState()

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading specs…</div>
      </div>
    )
  }

  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
          <FileText className="h-5 w-5" />
          {t('sow.specs.title')}
        </CardTitle>
        <CardDescription>{t('sow.specs.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {allServices.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ background: LAVENDER }}>
            <p className="text-sm italic" style={{ color: JET }}>{t('sow.services.none')}</p>
          </div>
        ) : (
          allServices.map((svc) => (
            <div key={svc.id}>
              <h3 className="font-semibold text-base mb-2" style={{ color: ORCHID }}>
                {brandClean(svc.name)}
              </h3>
              {svc.techSpecs.length === 0 ? (
                <p className="text-xs italic" style={{ color: JET, opacity: 0.6 }}>
                  No tech specs.
                </p>
              ) : (
                <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: LAVENDER }}>
                  <div
                    className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide p-2"
                    style={{ background: LAVENDER, color: JET }}
                  >
                    <div className="col-span-3">{t('sow.specs.field')}</div>
                    <div className="col-span-5">{t('sow.specs.description')}</div>
                    <div className="col-span-4">{t('sow.specs.value')}</div>
                  </div>
                  {svc.techSpecs.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 gap-2 p-2 border-t"
                      style={{ borderColor: LAVENDER, background: WHITE }}
                    >
                      <div className="col-span-3 font-medium text-sm" style={{ color: JET }}>
                        {row.field}
                      </div>
                      <div className="col-span-5 text-sm" style={{ color: JET, opacity: 0.85 }}>
                        {row.description}
                        {row.example && (
                          <span className="text-xs block" style={{ color: JET, opacity: 0.6 }}>
                            e.g., {row.example}
                          </span>
                        )}
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={state.specValues[row.id] || ''}
                          onChange={(e) => updateSpecValue(row.id, e.target.value)}
                          placeholder={row.example || ''}
                          className="h-8 text-sm"
                          style={{ borderColor: LAVENDER }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
