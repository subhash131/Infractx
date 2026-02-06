'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { MenuBar } from './menu-bar'
import { useState } from 'react'
import './styles.css'

export const TiptapEditor = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extensions = [TextStyle, StarterKit]
  
  const editor = useEditor({
    extensions: extensions,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Hi there," }]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Isn't that great? And all of that is editable. But wait, there's more. Let's try a code block:"
            }
          ]
        }
      ]
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'p-2 focus:outline-none min-h-screen',
      },
    },
  })

  const handleAIGenerate = async (prompt: string) => {
    if (!editor || isGenerating) return

    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/tiptap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      // Check if response is OK
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Generation failed')
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }

      // Verify we got the right content type
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/x-ndjson')) {
        throw new Error(`Unexpected content type: ${contentType}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      // Insert a new paragraph at the current position
      editor.commands.insertContent('<p></p>')
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.content) {
              // Insert content at the end of the document
              editor.commands.insertContentAt(editor.state.doc.content.size, parsed.content)
            }
          } catch (e) {
            console.error('Failed to parse line:', line, e)
          }
        }
      }
    } catch (error) {
      console.error('AI generation error:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <MenuBar editor={editor} />
      
      {/* AI Prompt Input */}
      <div className="flex flex-col gap-2 p-2 border-b">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask AI to generate content..."
            className="flex-1 px-3 py-2 border rounded"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                handleAIGenerate(e.currentTarget.value)
                e.currentTarget.value = ''
              }
            }}
            disabled={isGenerating}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement
              if (input?.value.trim()) {
                handleAIGenerate(input.value)
                input.value = ''
              }
            }}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm">
            Error: {error}
          </div>
        )}
      </div>

      <EditorContent editor={editor} />
      
      {/* Debug output */}
      <details className="p-2 border-t">
        <summary className="cursor-pointer">View JSON</summary>
        <pre className="mt-2 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(editor.getJSON(), null, 2)}
        </pre>
      </details>
    </div>
  )
}