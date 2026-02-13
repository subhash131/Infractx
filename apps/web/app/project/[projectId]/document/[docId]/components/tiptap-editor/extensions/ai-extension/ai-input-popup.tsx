'use client'
import './ai-input-popup.scss'
import { ChatWindow } from './chat/chat-window'
import { Editor } from '@tiptap/react'

interface AIInputPopupProps {
  editor:Editor
  from: number
  to: number
  onClose: () => void
}

export function AIInputPopup({ editor, from, to, onClose }: AIInputPopupProps) {
  return (
    <ChatWindow editor={editor} selection={{from, to}} onClose={onClose}/>
  )
}