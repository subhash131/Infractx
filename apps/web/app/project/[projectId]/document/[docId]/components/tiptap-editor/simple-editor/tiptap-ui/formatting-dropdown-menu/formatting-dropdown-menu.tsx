"use client"

import { forwardRef } from "react"
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { BoldIcon } from "../../tiptap-icons/bold-icon"
import { ChevronDownIcon } from "../../tiptap-icons/chevron-down-icon"
import { Button, ButtonGroup, type ButtonProps } from "../../tiptap-ui-primitive/button"
import { Card, CardBody } from "../../tiptap-ui-primitive/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../tiptap-ui-primitive/dropdown-menu"
import { MarkButton } from "../mark-button/mark-button"

export interface FormattingDropdownMenuProps extends Omit<ButtonProps, "type"> {
  editor?: any
  portal?: boolean
}

export const FormattingDropdownMenu = forwardRef<
  HTMLButtonElement,
  FormattingDropdownMenuProps
>(({ editor: providedEditor, portal = false, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)

  if (!editor) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          role="button"
          tabIndex={-1}
          aria-label="Formatting"
          tooltip="Formatting"
          {...buttonProps}
          ref={ref}
        >
          <BoldIcon className="tiptap-button-icon" />
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" portal={portal} className="mb-2">
        <Card>
          <CardBody>
            <ButtonGroup>
              <div className="flex flex-col">
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <MarkButton
                    editor={editor}
                    type="bold"
                    text="Bold"
                    className="w-full justify-start"
                    showShortcut
                  />
                </DropdownMenuItem>
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <MarkButton
                    editor={editor}
                    type="italic"
                    text="Italic"
                    className="w-full justify-start"
                    showShortcut
                  />
                </DropdownMenuItem>
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <MarkButton
                    editor={editor}
                    type="strike"
                    text="Strikethrough"
                    className="w-full justify-start"
                    showShortcut
                  />
                </DropdownMenuItem>
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <MarkButton
                    editor={editor}
                    type="underline"
                    text="Underline"
                    className="w-full justify-start"
                    showShortcut
                  />
                </DropdownMenuItem>
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <MarkButton
                    editor={editor}
                    type="code"
                    text="Code"
                    className="w-full justify-start"
                    showShortcut
                  />
                </DropdownMenuItem>
              </div>
            </ButtonGroup>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

FormattingDropdownMenu.displayName = "FormattingDropdownMenu"
