// SOW AI helper — generates SOW section content from a free-text brief.
//
// Tries the same LLM provider chain as src/lib/translate.ts:
//   1. OpenAI (if OPENAI_API_KEY is set)
//   2. Z-AI direct API (if ZAI_BASE_URL + ZAI_API_KEY are set)
//   3. z-ai-web-dev-sdk (if available)
//
// The endpoint is at /api/sow-ai/generate (separate route to keep the
// LLM call server-side).

export interface SOWAIBrief {
  brief: string
  context?: 'service' | 'task' | 'spec' | 'overview' | 'general'
}

export interface SOWAIResult {
  content: string
  provider: string
}

export async function generateSowContent(brief: SOWAIBrief): Promise<SOWAIResult> {
  const res = await fetch('/api/sow-ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to generate')
  return data
}
