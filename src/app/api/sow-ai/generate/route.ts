import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'

// POST /api/sow-ai/generate
//
// Body: { brief: string, context?: 'service' | 'task' | 'spec' | 'overview' | 'general' }
//
// Returns: { content: string, provider: string }
//
// Tries the same LLM provider chain as src/lib/translate.ts:
//   1. OpenAI (if OPENAI_API_KEY is set)
//   2. Z-AI direct API (if ZAI_BASE_URL + ZAI_API_KEY are set)
//   3. z-ai-web-dev-sdk (if available — try import)
//
// If no LLM is configured, returns a structured fallback so the UI still
// shows something useful (the user can edit it).

const CONTEXT_PROMPTS: Record<string, string> = {
  service: 'Generate a MassaPro SOW service section. Include: a one-line intro paragraph starting with "Your MassaPro Technical Services Engineer will deploy X to <client name>.", a "Configuration" bullet list (3-6 bullets), and a "Requirements" bullet list (2-5 bullets).',
  task: 'Generate a single MassaPro SOW configuration task. Include: a short title (max 8 words), a 1-2 sentence description in the Connex-template voice (replace Connex with MassaPro), and an estimated hours figure.',
  spec: 'Generate a MassaPro SOW technical specification row. Include: a short field name, a 1-sentence description, and a plausible example value.',
  overview: 'Generate a MassaPro SOW project overview paragraph (3-5 sentences). The overview should describe the engagement, scope, and expected outcomes. Replace any mention of Connex/ConnexAI with MassaPro.',
  general: 'Generate MassaPro SOW content based on the brief.',
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const brief = (body.brief || '').toString().trim()
    const context = (body.context || 'general').toString()
    if (!brief) return NextResponse.json({ error: 'Brief is required' }, { status: 400 })

    const contextPrompt = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.general
    const prompt = `${contextPrompt}\n\nBrief: ${brief}\n\nIMPORTANT: Replace any mention of "Connex" or "ConnexAI" with "MassaPro". Use a professional, vendor-neutral voice. Return only the content, no preamble.`

    // ---- 1. Try OpenAI ----
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content?.trim() || ''
          if (content) return NextResponse.json({ content, provider: 'openai' })
        }
      } catch (e) {
        // fall through
      }
    }

    // ---- 2. Try Z-AI direct API ----
    const zaiBaseUrl = process.env.ZAI_BASE_URL
    const zaiApiKey = process.env.ZAI_API_KEY
    if (zaiBaseUrl && zaiApiKey) {
      try {
        const response = await fetch(`${zaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${zaiApiKey}`,
            'X-Z-AI-From': 'Z',
          },
          body: JSON.stringify({
            model: process.env.ZAI_MODEL || 'glm-4.6',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content?.trim() || ''
          if (content) return NextResponse.json({ content, provider: 'zai' })
        }
      } catch (e) {
        // fall through
      }
    }

    // ---- 3. Try z-ai-web-dev-sdk (if installed) ----
    try {
      const sdk = await import('z-ai-web-dev-sdk').catch(() => null)
      if (sdk?.default) {
        const zai = await sdk.default.create()
        const result = await zai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
        })
        const content = result.choices?.[0]?.message?.content?.trim() || ''
        if (content) return NextResponse.json({ content, provider: 'zai-sdk' })
      }
    } catch (e) {
      // fall through
    }

    // ---- 4. Fallback — return a structured template so the UI still
    //          shows something useful when no LLM is configured. ----
    const fallback = generateFallback(brief, context)
    return NextResponse.json({ content: fallback, provider: 'fallback' })
  } catch (e: any) {
    console.error('[api/sow-ai/generate POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function generateFallback(brief: string, context: string): string {
  // Structured template fallback — the user can edit it. Keeps the AI
  // tab usable even when no LLM is configured on the platform.
  const b = brief.slice(0, 500)
  if (context === 'service') {
    return [
      'Your MassaPro Technical Services Engineer will deploy ' + b.slice(0, 60) + ' to <client name>.',
      '',
      'Configuration:',
      '● Provision and configure the ' + b.slice(0, 30) + ' module on the MassaPro platform.',
      '● Walk the client through the setup of core options and permissions.',
      '● Train the client admin on day-to-day management.',
      '',
      'Requirements:',
      '● Confirmation of the client\'s existing environment.',
      '● Access credentials for any 3rd-party system involved.',
      '● Sufficient interaction credit added to the account.',
    ].join('\n')
  }
  if (context === 'task') {
    return 'Configure ' + b.slice(0, 50) + ' on the MassaPro platform (estimated: 6 hours)'
  }
  if (context === 'spec') {
    return 'Field: ' + b.slice(0, 30) + '\nDescription: ' + b + '\nExample: (to be confirmed with the client)'
  }
  if (context === 'overview') {
    return 'This Statement of Work describes the services that MassaPro will deliver to <client name> for the ' + b.slice(0, 60) + ' initiative. The scope, deliverables and acceptance criteria outlined below reflect the brief and will be confirmed with the client at sign-off. MassaPro will work closely with the client team to ensure a smooth implementation, regular check-ins, and a successful go-live.'
  }
  return b
}
