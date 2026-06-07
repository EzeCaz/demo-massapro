import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { TRANSLATABLE_FIELDS, translateText } from '@/lib/translate'

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
    const { fields, direction } = body // direction: 'es-to-en', 'en-to-es', or 'auto'

    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const translations: Record<string, string> = {}
    const errors: string[] = []

    for (const field of fields) {
      const sourceText = (scenario as any)[field]
      if (!sourceText || sourceText.trim() === '') continue

      let sourceLang: string
      let targetLang: string

      if (direction === 'es-to-en') {
        sourceLang = 'Spanish'
        targetLang = 'English'
      } else if (direction === 'en-to-es') {
        sourceLang = 'English'
        targetLang = 'Spanish'
      } else {
        // Auto: determine based on which translation fields are empty
        const enValue = (scenario as any)[field + 'En']
        const esValue = (scenario as any)[field + 'Es']
        if (!enValue && esValue) {
          sourceLang = 'Spanish'
          targetLang = 'English'
        } else {
          sourceLang = 'English'
          targetLang = 'Spanish'
        }
      }

      try {
        const translated = await translateText(sourceText, sourceLang, targetLang)
        if (translated) {
          translations[field] = translated
        }
      } catch (err: any) {
        console.error(`Translation error for field ${field}:`, err.message)
        errors.push(`${field}: ${err.message}`)
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
      } else if (direction === 'en-to-es') {
        const esField = field + 'Es'
        if (esField in scenario) {
          updateData[esField] = value
        }
      } else {
        // Auto: save to both En and Es suffixes based on what's empty
        const enField = field + 'En'
        const esField = field + 'Es'
        if (!(scenario as any)[enField] && enField in scenario) {
          updateData[enField] = value
        }
        if (!(scenario as any)[esField] && esField in scenario) {
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

    // If there were errors and no translations succeeded, return error
    if (errors.length > 0 && Object.keys(translations).length === 0) {
      return NextResponse.json({
        error: 'Translation failed',
        details: errors,
      }, { status: 500 })
    }

    return NextResponse.json({
      translations,
      direction,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    })
  } catch (error: any) {
    console.error('Translation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}
