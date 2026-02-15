'use client'
import './ai-input-popup.scss'
import { ChatWindow } from './chat/chat-window'
import { Editor } from '@tiptap/react'

interface AIInputPopupProps {
  editor:Editor
  onClose: () => void
}

export function AIInputPopup({ editor, onClose }: AIInputPopupProps) {
  return (
    <ChatWindow editor={editor} onClose={onClose}/>
  )
}