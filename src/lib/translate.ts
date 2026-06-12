import ZAI from 'z-ai-web-dev-sdk'

// Technical / professional terms that should NEVER be translated
const TECHNICAL_TERMS = [
  'ERP', 'CRM', 'CCaaS', 'CPaaS', 'CTA', 'CPA', 'KPI', 'AI', 'FAQ', 'URL', 'API',
  'SaaS', 'B2B', 'B2C', 'ROI', 'SLA', 'IVR', 'NLP', 'LLM', 'GPT', 'SMS', 'HTTP',
  'HTTPS', 'REST', 'SOAP', 'OAuth', 'JWT', 'SSH', 'DNS', 'CDN', 'SDK', 'UI', 'UX',
  'HTML', 'CSS', 'SQL', 'NoSQL', 'TCP', 'IP', 'VPN', 'LAN', 'WAN', 'PBX',
  'ACD', 'VoIP', 'SIP', 'PSTN', 'UCaaS', 'CX', 'BX', 'RX',
]

export const TRANSLATABLE_FIELDS = [
  'overview', 'companyGoals', 'aiAutomationsRequired', 'demoFocusAreas',
  'scriptsFlows', 'knowledgeBaseText', 'faqObjectionHandling',
  'requiredIntegrations', 'erpCrmCcaas',
]

export const PRESERVED_TERMS = TECHNICAL_TERMS

// Singleton SDK instance
let zaiInstance: InstanceType<typeof ZAI> | null = null

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

/**
 * Call LLM API for translation — uses z-ai-web-dev-sdk (primary)
 * or falls back to OpenAI API (if OPENAI_API_KEY env var is set)
 */
export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const preserveList = TECHNICAL_TERMS.join(', ')

  const prompt = `You are a professional business translator for AI and technology content.

Translate the following ${sourceLang} text to ${targetLang}.

IMPORTANT RULES:
1. Do NOT translate the following technical/professional terms — keep them exactly as-is: ${preserveList}
2. Do NOT translate URLs (e.g., https://example.com, www.example.com) — keep them exactly as-is
3. Do NOT translate code snippets, variable names, or technical identifiers
4. Do NOT translate email addresses
5. Do NOT translate brand names or product names
6. Translate naturally and professionally, preserving the business context and tone
7. Keep the same formatting (paragraphs, bullet points, line breaks)
8. If a word or phrase is an internationally recognized professional term (like CRM, KPI, SLA, CTA, etc.), keep it unchanged
9. Only return the translated text, nothing else

Text to translate:
${text}`

  // Try z-ai-web-dev-sdk first (works on Vercel serverless)
  try {
    const sdk = await getZAI()
    const result = await sdk.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })
    const translated = result.choices?.[0]?.message?.content?.trim() || ''
    if (translated) return translated
  } catch (err: any) {
    console.error('z-ai-web-dev-sdk translation error:', err.message)
    // Fall through to OpenAI fallback
  }

  // Fallback: Try OpenAI API (if OPENAI_API_KEY env var is set)
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
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const translated = data.choices?.[0]?.message?.content?.trim() || ''
      if (translated) return translated
    } catch (err: any) {
      console.error('OpenAI translation error:', err.message)
    }
  }

  throw new Error('All translation providers failed. Please try again later.')
}
