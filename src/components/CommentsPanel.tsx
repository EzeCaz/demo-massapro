'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Send } from 'lucide-react'

interface CommentsPanelProps {
  scenarioId: string
}

export default function CommentsPanel({ scenarioId }: CommentsPanelProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', scenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}/comments`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      return res.json()
    },
  })

  const addComment = async () => {
    if (!content.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    // Extract @mentions
    const mentions = content.match(/@[\w.@]+/g) || []
    const taggedUsers = mentions.map(m => m.substring(1)).join(',')

    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, taggedUsers }),
      })
      if (res.ok) {
        toast.success('Comment added')
        setContent('')
        queryClient.invalidateQueries({ queryKey: ['comments', scenarioId] })
      } else {
        toast.error('Failed to add comment')
      }
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  // Color palette for different authors
  const authorColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-orange-100 text-orange-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
  ]

  const getAuthorColor = (authorId: string) => {
    const hash = authorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return authorColors[hash % authorColors.length]
  }

  const renderContent = (text: string) => {
    // Highlight @mentions
    const parts = text.split(/(@[\w.@]+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-vivid-blue/10 text-vivid-blue font-medium px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="space-y-4">
      {/* Add Comment */}
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t('comments.placeholder')}
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button onClick={addComment} size="sm" className="bg-vivid-blue hover:bg-blue-700">
            <Send className="h-4 w-4 mr-1" />
            {t('comments.send')}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('general.loading')}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('general.noData')}</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {comments.map((comment: any) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${getAuthorColor(comment.authorId)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {comment.author?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {comment.author?.name || comment.author?.email || 'Unknown'}
                </span>
                <span className="text-xs opacity-70">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{renderContent(comment.content)}</p>
              {comment.taggedUsers && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {comment.taggedUsers.split(',').map((email: string, i: number) => (
                    <span key={i} className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
                      @{email}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
