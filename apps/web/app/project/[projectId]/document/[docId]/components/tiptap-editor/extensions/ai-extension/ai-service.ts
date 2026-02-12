export interface AIRequest {
  prompt: string
  selectedText: string
}

export interface AIResponse {
  result: string
}

export async function processAIRequest(
  request: AIRequest
): Promise<AIResponse> {
  try {
    const response = await fetch('/api/ai/tiptap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('AI request failed')
    }

    const data = await response.json()
    return { result: data.result }
  } catch (error) {
    console.error('AI processing error:', error)
    throw error
  }
}