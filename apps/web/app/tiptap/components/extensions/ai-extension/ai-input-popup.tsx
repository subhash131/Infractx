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
    // <div className="ai-input-popup-overlay" onClick={onClose}>
    //   <div className="ai-input-popup" onClick={(e) => e.stopPropagation()}>
    //     <div className="ai-input-header">
    //       <h3>✨ Ask AI</h3>
    //       <button className="ai-close-button" onClick={onClose}>
    //         ✕
    //       </button>
    //     </div>
        
    //     <form onSubmit={handleSubmit}>
    //       <textarea
    //         ref={inputRef}
    //         className="ai-input-textarea"
    //         placeholder="Type..."
    //         value={prompt}
    //         onChange={(e) => setPrompt(e.target.value)}
    //         onKeyDown={handleKeyDown}
    //         rows={3}
    //         disabled={isLoading}
    //       />
          
    //       <div className="ai-input-actions w-60 overflow-hidden">
    //         <div className="ai-input-buttons">
    //           <button
    //             type="button"
    //             className="ai-cancel-button"
    //             onClick={onClose}
    //             disabled={isLoading}
    //           >
    //             Cancel
    //           </button>
    //           <button
    //             type="submit"
    //             className="ai-submit-button"
    //             disabled={!prompt.trim() || isLoading}
    //           >
    //             {isLoading ? 'Processing...' : 'Submit'}
    //           </button>
    //         </div>
    //       </div>
    //     </form>
    //   </div>
    // </div>
    <ChatWindow/>
  )
}