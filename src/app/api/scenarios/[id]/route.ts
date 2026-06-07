import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { TRANSLATABLE_FIELDS, translateText } from '@/lib/translate'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    const scenario = await db.scenario.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, company: true, role: true } },
        kpis: true,
        attachments: true,
        collaborations: { include: { collaborator: { select: { id: true, name: true, email: true } } } },
        comments: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
        changeLogs: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
        adminNotes: { include: { sentByAdmin: { select: { id: true, name: true, email: true } } } },
      },
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // Allow access if admin, owner, or collaborator
    if (session?.user) {
      const userId = (session.user as any).id
      const userRole = (session.user as any).role
      const isOwner = scenario.clientId === userId
      const isCollaborator = scenario.collaborations.some(c => c.collaboratorId === userId)

      if (!isAdminRole(userRole) && !isOwner && !isCollaborator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Get scenario error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const body = await req.json()

    const existingScenario = await db.scenario.findUnique({
      where: { id },
    })

    if (!existingScenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // Check permissions
    if (!isAdminRole(userRole) && existingScenario.clientId !== userId) {
      const collab = await db.collaboration.findFirst({
        where: { scenarioId: id, collaboratorId: userId, accessLevel: 'edit' },
      })
      if (!collab) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Track changes
    const fieldsToTrack = [
      'name', 'companyWebsiteUrl', 'overview', 'companyGoals',
      'aiAutomationsRequired', 'demoFocusAreas', 'languagesVoice', 'languagesText',
      'scriptsFlows', 'knowledgeBaseText', 'faqObjectionHandling',
      'requiredIntegrations', 'erpCrmCcaas',
    ]

    const changeLogs: { scenarioId: string; userId: string; fieldName: string; oldValue: string | null; newValue: string | null; changeSummary?: string }[] = []

    for (const field of fieldsToTrack) {
      if (body[field] !== undefined && body[field] !== (existingScenario as any)[field]) {
        const oldVal = (existingScenario as any)[field]
        const newVal = body[field]
        if (oldVal !== newVal) {
          changeLogs.push({
            scenarioId: id,
            userId,
            fieldName: field,
            oldValue: oldVal || null,
            newValue: newVal || null,
            changeSummary: `Changed ${field}`,
          })
        }
      }
    }

    // Update scenario
    const updateData: any = {}
    const allowedFields = [
      'name', 'order', 'companyWebsiteUrl', 'overview', 'overviewEs', 'overviewEn',
      'companyGoals', 'companyGoalsEs', 'companyGoalsEn',
      'aiAutomationsRequired', 'aiAutomationsRequiredEs', 'aiAutomationsRequiredEn',
      'demoFocusAreas', 'demoFocusAreasEs', 'demoFocusAreasEn',
      'languagesVoice', 'languagesText',
      'scriptsFlows', 'scriptsFlowsEs', 'scriptsFlowsEn',
      'knowledgeBaseText', 'knowledgeBaseTextEs', 'knowledgeBaseTextEn',
      'faqObjectionHandling', 'faqObjectionHandlingEs', 'faqObjectionHandlingEn',
      'requiredIntegrations', 'requiredIntegrationsEs', 'requiredIntegrationsEn',
      'erpCrmCcaas', 'erpCrmCcaasEs', 'erpCrmCcaasEn',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    const scenario = await db.scenario.update({
      where: { id },
      data: updateData,
    })

    // Create change logs
    if (changeLogs.length > 0) {
      await db.changeLog.createMany({ data: changeLogs })
    }

    // Auto-translate: when autoTranslate is true, translate any
    // translatable fields that have content but missing En/Es translations
    let translationResults: Record<string, string> | null = null
    if (body.autoTranslate) {
      try {
        const translationUpdates: any = {}
        translationResults = {}

        // Re-read the updated scenario to get fresh data
        const freshScenario = await db.scenario.findUnique({ where: { id } })
        if (freshScenario) {
          for (const field of TRANSLATABLE_FIELDS) {
            const baseValue = (freshScenario as any)[field]
            if (!baseValue || baseValue.trim() === '') continue

            const enValue = (freshScenario as any)[field + 'En']
            const esValue = (freshScenario as any)[field + 'Es']

            // Translate to English if En is empty
            if (!enValue) {
              try {
                const translated = await translateText(baseValue, 'Spanish', 'English')
                if (translated) {
                  translationUpdates[field + 'En'] = translated
                  translationResults[field + 'En'] = translated
                }
              } catch (err) {
                console.error(`Auto-translate error for ${field}En:`, err)
              }
            }

            // Translate to Spanish if Es is empty
            if (!esValue) {
              try {
                const translated = await translateText(baseValue, 'English', 'Spanish')
                if (translated) {
                  translationUpdates[field + 'Es'] = translated
                  translationResults[field + 'Es'] = translated
                }
              } catch (err) {
                console.error(`Auto-translate error for ${field}Es:`, err)
              }
            }
          }

          // Save all translations at once
          if (Object.keys(translationUpdates).length > 0) {
            await db.scenario.update({
              where: { id },
              data: translationUpdates,
            })
          }
        }
      } catch (err) {
        console.error('Auto-translate error:', err)
        // Don't fail the save if translation fails
      }
    }

    return NextResponse.json({
      ...scenario,
      ...(translationResults ? { _translations: translationResults } : {}),
    })
  } catch (error) {
    console.error('Update scenario error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    if (!isAdminRole(userRole) && scenario.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.scenario.delete({ where: { id } })

    return NextResponse.json({ message: 'Scenario deleted' })
  } catch (error) {
    console.error('Delete scenario error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
