import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { translateText } from '@/lib/translate'
import { readShareScope } from '@/lib/share-scope'

// POST /api/integration-setups/[id]/translate
// Body: { fields: string[], direction: 'es-to-en' | 'en-to-es' | 'he-to-en' | 'en-to-he' | 'es-to-he' | 'he-to-es' }
// Translates the source language variant of each field into the target
// language variant and persists it. Mirrors the scenarios translate route.
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
    const { fields, direction } = body

    const setup = await db.integrationSetup.findUnique({ where: { id } })
    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    // Permission: admin, owner, or share editor (view-only shares cannot
    // translate because that would write En/Es/He variants).
    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const scope = readShareScope(session.user as any)
    if (scope.isShare) {
      if (scope.setupId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (scope.accessLevel !== 'edit') {
        return NextResponse.json({ error: 'View-only access' }, { status: 403 })
      }
    } else if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const directionLangMap: Record<string, [string, string]> = {
      'es-to-en': ['Spanish', 'English'],
      'en-to-es': ['English', 'Spanish'],
      'he-to-en': ['Hebrew', 'English'],
      'en-to-he': ['English', 'Hebrew'],
      'es-to-he': ['Spanish', 'Hebrew'],
      'he-to-es': ['Hebrew', 'Spanish'],
    }

    const directionSourceSuffixMap: Record<string, string> = {
      'es-to-en': 'Es',
      'en-to-es': 'En',
      'he-to-en': 'He',
      'en-to-he': 'En',
      'es-to-he': 'Es',
      'he-to-es': 'He',
    }

    const directionTargetSuffixMap: Record<string, string> = {
      'es-to-en': 'En',
      'en-to-es': 'Es',
      'he-to-en': 'En',
      'en-to-he': 'He',
      'es-to-he': 'He',
      'he-to-es': 'Es',
    }

    const translations: Record<string, string> = {}
    const errors: string[] = []

    for (const field of fields) {
      let sourceText: string | null = null
      const sourceSuffix = directionSourceSuffixMap[direction]
      if (sourceSuffix) {
        sourceText = (setup as any)[field + sourceSuffix] || null
      }
      if (!sourceText || sourceText.trim() === '') {
        sourceText = (setup as any)[field] || null
      }
      if (!sourceText || sourceText.trim() === '') continue

      const [sourceLang, targetLang] = directionLangMap[direction] || ['English', 'Spanish']

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

    const updateData: any = {}
    const targetSuffix = directionTargetSuffixMap[direction]
    for (const [field, value] of Object.entries(translations)) {
      const targetField = field + targetSuffix
      if (targetField in setup) {
        updateData[targetField] = value
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.integrationSetup.update({
        where: { id },
        data: updateData,
      })
    }

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
    console.error('Integration setup translation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}
