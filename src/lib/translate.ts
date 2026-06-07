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

/**
 * Call LLM API for translation — supports OpenAI API (with OPENAI_API_KEY env var)
 * or falls back to z-ai-web-dev-sdk (works in z.ai platform environment)
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

  // Try OpenAI API first (works on Vercel)
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
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
    return data.choices?.[0]?.message?.content?.trim() || ''
  }

  // Fallback: try z-ai-web-dev-sdk (works in z.ai platform)
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const sdk = await ZAI.create()
    const result = await sdk.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })
    return result.choices?.[0]?.message?.content?.trim() || ''
  } catch (err: any) {
    throw new Error(`No translation provider available. Set OPENAI_API_KEY environment variable. ${err.message}`)
  }
}
