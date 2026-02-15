"use client"
import { forwardRef, useCallback } from "react"
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { Button } from "../../tiptap-ui-primitive/button"
import { SparklesIcon } from "../../tiptap-icons/sparkles-icon"

export const AIButton = forwardRef<HTMLButtonElement>((props, ref) => {
  const { editor } = useTiptapEditor()

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      
      if (!editor) return

      const { state } = editor
      const { selection } = state
      const { from, to } = selection;

      // Compatibility for existing AI extension

      window.dispatchEvent(
        new CustomEvent("toggle-ai-chat", {
          detail: {
            from,
            to,
            togglePopup:true
          },
        })
      )
    },
    [editor]
  )

  return (
    <Button
       type="button"
       data-style="ghost"
       onClick={handleClick}
       aria-label="Ask AI"
       tooltip="Ask AI"
       ref={ref}
       className="whitespace-nowrap"
    >
      <SparklesIcon className="tiptap-button-icon" />
      <span className="tiptap-button-text">Ask AI</span>
    </Button>
  )
})

AIButton.displayName = "AIButton"
