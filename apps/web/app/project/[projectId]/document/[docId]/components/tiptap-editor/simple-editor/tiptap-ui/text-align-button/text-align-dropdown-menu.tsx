"use client"

import { forwardRef, useCallback, useEffect, useState } from "react"

// --- Icons ---
import { ChevronDownIcon } from "../../tiptap-icons/chevron-down-icon"
import  { textAlignIcons, type TextAlign } from "./use-text-align"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import { TextAlignButton } from "./text-align-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button, ButtonGroup } from "../../tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../tiptap-ui-primitive/dropdown-menu"
import { Card, CardBody } from "../../tiptap-ui-primitive/card"
import { isExtensionAvailable } from "../../../utils/tiptap-utils"

export interface TextAlignDropdownMenuProps
  extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: any
  /**
   * Whether to render the dropdown menu in a portal
   * @default false
   */
  portal?: boolean
  /**
   * Whether to hide the button when the extension is unavailable
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback for when the dropdown opens or closes
   */
  onOpenChange?: (isOpen: boolean) => void
}

const alignments: TextAlign[] = ["left", "center", "right", "justify"]

/**
 * Dropdown menu component for selecting text alignment in a Tiptap editor.
 */
export const TextAlignDropdownMenu = forwardRef<
  HTMLButtonElement,
  TextAlignDropdownMenuProps
>(
  (
    {
      editor: providedEditor,
      hideWhenUnavailable = false,
      portal = false,
      onOpenChange,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [activeAlign, setActiveAlign] = useState<TextAlign>("left")
    const [isVisible, setIsVisible] = useState<boolean>(true)
    const [canAlign, setCanAlign] = useState<boolean>(false)

    const updateState = useCallback(() => {
      if (!editor) return

      const available = isExtensionAvailable(editor, "textAlign")
      if (hideWhenUnavailable && !available) {
        setIsVisible(false)
        return
      }
      setIsVisible(true)
      setCanAlign(editor.isEditable && available)

      const current = alignments.find((align) =>
        editor.isActive({ textAlign: align })
      )
      setActiveAlign(current || "left")
    }, [editor, hideWhenUnavailable])

    useEffect(() => {
      if (!editor) return

      updateState()
      editor.on("selectionUpdate", updateState)
      editor.on("transaction", updateState)

      return () => {
        editor.off("selectionUpdate", updateState)
        editor.off("transaction", updateState)
      }
    }, [editor, updateState])

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!editor || !canAlign) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [canAlign, editor, onOpenChange]
    )

    if (!isVisible) {
      return null
    }

    const ActiveIcon = textAlignIcons[activeAlign]

    return (
      <DropdownMenu modal open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            data-style="ghost"
            data-active-state={isOpen ? "on" : "off"}
            role="button"
            tabIndex={-1}
            disabled={!canAlign}
            data-disabled={!canAlign}
            aria-label="Text alignment"
            aria-pressed={isOpen}
            tooltip="Text align"
            {...buttonProps}
            ref={ref}
          >
            <ActiveIcon className="tiptap-button-icon" />
            <ChevronDownIcon className="tiptap-button-dropdown-small" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" portal={portal} className="mb-2">
          <Card>
            <CardBody>
              <ButtonGroup>
                <div className="flex">
                  {alignments.map((align) => (
                    <DropdownMenuItem key={`align-${align}`} asChild>
                      <TextAlignButton
                        editor={editor}
                        align={align}
                        showTooltip={false}
                        onClick={() => setIsOpen(false)}
                        />
                    </DropdownMenuItem>
                  ))}
                </div>
              </ButtonGroup>
            </CardBody>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

TextAlignDropdownMenu.displayName = "TextAlignDropdownMenu"

export default TextAlignDropdownMenu
