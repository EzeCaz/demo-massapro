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
    const { fields, direction } = body // direction: 'es-to-en', 'en-to-es', 'he-to-en', 'en-to-he', 'es-to-he', 'he-to-es', or 'auto'

    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const translations: Record<string, string> = {}
    const errors: string[] = []

    // Map direction to source/target languages
    const directionLangMap: Record<string, [string, string]> = {
      'es-to-en': ['Spanish', 'English'],
      'en-to-es': ['English', 'Spanish'],
      'he-to-en': ['Hebrew', 'English'],
      'en-to-he': ['English', 'Hebrew'],
      'es-to-he': ['Spanish', 'Hebrew'],
      'he-to-es': ['Hebrew', 'Spanish'],
    }

    // Map direction to the source field suffix (to read the correct language variant)
    const directionSourceSuffixMap: Record<string, string> = {
      'es-to-en': 'Es',   // Read from Es field
      'en-to-es': 'En',   // Read from En field
      'he-to-en': 'He',   // Read from He field
      'en-to-he': 'En',   // Read from En field
      'es-to-he': 'Es',   // Read from Es field
      'he-to-es': 'He',   // Read from He field
    }

    // Map direction to target field suffix (to save the translation)
    const directionTargetSuffixMap: Record<string, string> = {
      'es-to-en': 'En',
      'en-to-es': 'Es',
      'he-to-en': 'En',
      'en-to-he': 'He',
      'es-to-he': 'He',
      'he-to-es': 'Es',
    }

    for (const field of fields) {
      // Determine the source text: try the language-specific field first, then fall back to base field
      let sourceText: string | null = null
      const sourceSuffix = directionSourceSuffixMap[direction]
      if (sourceSuffix) {
        // Try the language-specific field first (e.g., overviewHe for he-to-en)
        sourceText = (scenario as any)[field + sourceSuffix] || null
      }
      // Fall back to the base field if the language-specific field is empty
      if (!sourceText || sourceText.trim() === '') {
        sourceText = (scenario as any)[field] || null
      }
      if (!sourceText || sourceText.trim() === '') continue

      let sourceLang: string
      let targetLang: string

      if (directionLangMap[direction]) {
        [sourceLang, targetLang] = directionLangMap[direction]
      } else {
        // Auto: determine based on which translation fields are empty
        const enValue = (scenario as any)[field + 'En']
        const heValue = (scenario as any)[field + 'He']
        const esValue = (scenario as any)[field + 'Es']
        if (!enValue && (esValue || heValue)) {
          sourceLang = esValue ? 'Spanish' : 'Hebrew'
          targetLang = 'English'
        } else if (!heValue && (enValue || esValue)) {
          sourceLang = enValue ? 'English' : 'Spanish'
          targetLang = 'Hebrew'
        } else if (!esValue && (enValue || heValue)) {
          sourceLang = enValue ? 'English' : 'Hebrew'
          targetLang = 'Spanish'
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
      const targetSuffix = directionTargetSuffixMap[direction]
      if (targetSuffix) {
        const targetField = field + targetSuffix
        if (targetField in scenario) {
          updateData[targetField] = value
        }
      } else {
        // Auto: save to whichever suffix field is empty
        const enField = field + 'En'
        const esField = field + 'Es'
        const heField = field + 'He'
        if (!(scenario as any)[enField] && enField in scenario) {
          updateData[enField] = value
        }
        if (!(scenario as any)[esField] && esField in scenario) {
          updateData[esField] = value
        }
        if (!(scenario as any)[heField] && heField in scenario) {
          updateData[heField] = value
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
