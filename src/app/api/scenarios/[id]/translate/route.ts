import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { fields, direction } = body // direction: 'es-to-en' or 'en-to-es'

    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const sdk = await ZAI.create()
    const translations: Record<string, string> = {}
    const technicalTerms = ['ERP', 'CRM', 'CCaaS', 'CTA', 'CPA', 'KPI', 'AI', 'FAQ', 'URL', 'API', 'SaaS', 'B2B', 'B2C', 'ROI']

    for (const field of fields) {
      const sourceText = (scenario as any)[field]
      if (!sourceText || sourceText.trim() === '') continue

      const preserveTerms = technicalTerms.map(t => `${t}`).join(', ')
      const targetLang = direction === 'es-to-en' ? 'English' : 'Spanish'
      const sourceLang = direction === 'es-to-en' ? 'Spanish' : 'English'

      try {
        const prompt = `Translate the following ${sourceLang} text to ${targetLang}. Preserve these technical terms exactly as-is (do NOT translate them): ${preserveTerms}. Only return the translated text, nothing else.\n\nText:\n${sourceText}`

        const result = await sdk.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        })

        const translated = result.choices?.[0]?.message?.content || ''
        if (translated) {
          translations[field] = translated.trim()
        }
      } catch (err) {
        console.error(`Translation error for field ${field}:`, err)
        translations[field] = sourceText
      }
    }

    // Save translations to the scenario
    const updateData: any = {}
    for (const [field, value] of Object.entries(translations)) {
      if (direction === 'es-to-en') {
        const enField = field + 'En'
        if (enField in scenario) {
          updateData[enField] = value
        }
      } else {
        const esField = field + 'Es'
        if (esField in scenario) {
          updateData[esField] = value
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.scenario.update({
        where: { id },
        data: updateData,
      })
    }

    return NextResponse.json({ translations, direction })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
