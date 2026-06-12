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

// Language code mapping for MyMemory API
const langCodeMap: Record<string, string> = {
  'English': 'en',
  'Spanish': 'es',
  'Hebrew': 'he',
}

/**
 * Call LLM API for translation — tries providers in order:
 * 1. OpenAI API (if OPENAI_API_KEY env var is set) — best quality
 * 2. Z-AI API (works in z.ai platform environment)
 * 3. z-ai-web-dev-sdk (works in z.ai platform with .z-ai-config file)
 * 4. MyMemory Translation API (free, no key required) — fallback
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

  // 1. Try OpenAI API first (if OPENAI_API_KEY env var is set) — best quality
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
      // Fall through to next provider
    }
  }

  // 2. Try Z-AI direct API (works in z.ai platform environment)
  const zaiBaseUrl = process.env.ZAI_BASE_URL
  const zaiApiKey = process.env.ZAI_API_KEY
  const zaiToken = process.env.ZAI_TOKEN
  const zaiUserId = process.env.ZAI_USER_ID
  if (zaiBaseUrl && zaiApiKey) {
    try {
      const url = `${zaiBaseUrl}/chat/completions`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zaiApiKey}`,
        'X-Z-AI-From': 'Z',
      }
      // Add optional auth headers if available
      if (zaiToken) headers['X-Token'] = zaiToken
      if (zaiUserId) headers['X-User-Id'] = zaiUserId

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          thinking: { type: 'disabled' },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Z-AI API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const translated = data.choices?.[0]?.message?.content?.trim() || ''
      if (translated) return translated
    } catch (err: any) {
      console.error('Z-AI translation error:', err.message)
      // Fall through to next provider
    }
  }

  // 3. Try z-ai-web-dev-sdk (works in z.ai platform with .z-ai-config file)
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const sdk = await ZAI.create()
    const result = await sdk.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })
    const translated = result.choices?.[0]?.message?.content?.trim() || ''
    if (translated) return translated
  } catch (err: any) {
    console.error('z-ai-web-dev-sdk translation error:', err.message)
    // Fall through to MyMemory fallback
  }

  // 4. Fallback: MyMemory Translation API (free, no key required)
  try {
    const srcCode = langCodeMap[sourceLang] || sourceLang.toLowerCase().substring(0, 2)
    const tgtCode = langCodeMap[targetLang] || targetLang.toLowerCase().substring(0, 2)

    // MyMemory has a 500 char limit per request, so chunk if needed
    const chunks = splitTextForTranslation(text, 450)
    const translatedChunks: string[] = []

    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${srcCode}|${tgtCode}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`MyMemory API error (${response.status})`)
      }

      const data = await response.json()
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        translatedChunks.push(data.responseData.translatedText)
      } else {
        throw new Error(`MyMemory translation failed: ${data.responseDetails || 'Unknown error'}`)
      }
    }

    const translated = translatedChunks.join('\n')
    if (translated && translated.trim()) return translated.trim()
  } catch (err: any) {
    console.error('MyMemory translation error:', err.message)
  }

  throw new Error('All translation providers failed. Please try again later.')
}

/**
 * Split text into chunks that fit within the MyMemory API character limit
 */
function splitTextForTranslation(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  const lines = text.split('\n')
  let currentChunk = ''

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = line
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim())
  return chunks
}
