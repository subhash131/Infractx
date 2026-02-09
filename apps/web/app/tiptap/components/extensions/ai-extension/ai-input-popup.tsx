'use client'

import { useState, useRef, useEffect } from 'react'
import './ai-input-popup.scss'
import { ChatWindow } from './chat/chat-window'

interface AIInputPopupProps {
  from: number
  to: number
  onClose: () => void
  onSubmit: (prompt: string, selectedText: string) => void
}

export function AIInputPopup({ from, to, onClose, onSubmit }: AIInputPopupProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    
    // Get the editor view from global reference
    const editorView = (window as any).__tiptapEditorView
    
    if (!editorView) {
      console.error('Editor view not found')
      setIsLoading(false)
      return
    }
    
    // Get the selected text from the editor
    const selectedText = editorView.state.doc.textBetween(from, to, ' ')
    
    try {
      await onSubmit(prompt, selectedText)
      onClose()
    } catch (error) {
      console.error('AI request failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  return (
    <ChatWindow />
  )
}