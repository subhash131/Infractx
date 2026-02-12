"use client"

import { useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { isNodeInSchema } from "../../../utils/tiptap-utils"
import { TableIcon } from "../../tiptap-icons/table-icon"

export interface UseTableConfig {
  editor?: Editor | null
  hideWhenUnavailable?: boolean
  onToggled?: () => void
}

export function canInsertTable(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) {
    return false
  }
  const isInSchema = isNodeInSchema("table", editor)
  // console.log("canInsertTable check:", { isEditable: editor.isEditable, isInSchema })
  return isInSchema
}

export function insertTable(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  
  // @ts-ignore - Dynamic command
  return editor.chain().focus().insertCustomTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

export function useTable(config?: UseTableConfig) {
  const {
    editor,
    hideWhenUnavailable = false,
    onToggled,
  } = config || {}

  const [isVisible, setIsVisible] = useState<boolean>(true)
  const canInsert = canInsertTable(editor || null)
  const isActive = editor?.isActive("table") || false

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
        // Table button is always visible if table extension is present
        // unless explicitly hidden when unavailable (which might mean something else for tables)
       setIsVisible(canInsertTable(editor))
    }

    handleSelectionUpdate()

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  const handleInsert = useCallback(() => {
    if (!editor) {
      console.log("Table insert failed: No editor")
      return false
    }

    console.log("Attempting to insert table...")
    const success = insertTable(editor)
    console.log("Insert table result:", success)
    
    if (success) {
      onToggled?.()
    }
    return success
  }, [editor, onToggled])

  return {
    isVisible,
    isActive,
    handleInsert,
    canInsert,
    label: "Table",
    Icon: TableIcon,
  }
}
