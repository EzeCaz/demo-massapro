'use client'

import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChangeLogPanelProps {
  scenarioId: string
}

export default function ChangeLogPanel({ scenarioId }: ChangeLogPanelProps) {
  const { t } = useLanguage()

  const { data: changelog = [], isLoading } = useQuery({
    queryKey: ['changelog', scenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}/changelog`)
      if (!res.ok) throw new Error('Failed to fetch changelog')
      return res.json()
    },
  })

  // Color palette for different users
  const userColors = [
    'border-l-blue-500',
    'border-l-green-500',
    'border-l-purple-500',
    'border-l-orange-500',
    'border-l-pink-500',
  ]

  const getUserColor = (userId: string) => {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return userColors[hash % userColors.length]
  }

  const formatFieldName = (name: string): string => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('tab.changeHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('general.loading')}</p>
        ) : changelog.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('general.noData')}</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {changelog.map((log: any) => (
              <div
                key={log.id}
                className={`border-l-4 ${getUserColor(log.userId)} pl-3 py-2`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {log.user?.name || log.user?.email || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm">
                  <Badge variant="outline" className="text-xs mr-2">
                    {formatFieldName(log.fieldName)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {log.oldValue ? (
                      <>
                        <span className="line-through text-destructive/70">{log.oldValue.substring(0, 50)}</span>
                        {' → '}
                      </>
                    ) : null}
                    {log.newValue ? (
                      <span className="text-emerald">{log.newValue.substring(0, 50)}</span>
                    ) : (
                      <span className="text-muted-foreground italic">cleared</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
