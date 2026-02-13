
import { Spacer } from "../../tiptap-ui-primitive/spacer"
import { ToolbarGroup, ToolbarSeparator } from "../../tiptap-ui-primitive/toolbar"
import { BlockquoteButton } from "../../tiptap-ui/blockquote-button"
import { CodeBlockButton } from "../../tiptap-ui/code-block-button"
import { ColorHighlightPopover, ColorHighlightPopoverButton } from "../../tiptap-ui/color-highlight-popover"
import { HeadingDropdownMenu } from "../../tiptap-ui/heading-dropdown-menu"
import { LinkButton, LinkPopover } from "../../tiptap-ui/link-popover"
import { ListDropdownMenu } from "../../tiptap-ui/list-dropdown-menu"
import { MarkButton } from "../../tiptap-ui/mark-button"
import { TextAlignDropdownMenu } from "../../tiptap-ui/text-align-button"
import { UndoRedoButton } from "../../tiptap-ui/undo-redo-button"

import { TableButton } from "../../tiptap-ui/table-button/table-button"
import { FormattingDropdownMenu } from "../../tiptap-ui/formatting-dropdown-menu/formatting-dropdown-menu"


export const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        {/* <BlockquoteButton /> */}
        <CodeBlockButton />
        <TableButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <FormattingDropdownMenu portal={isMobile} />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator /> */}

      <ToolbarGroup>
        <TextAlignDropdownMenu />
      </ToolbarGroup>


      {/* <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup> */}

      <Spacer />

      {isMobile && <ToolbarSeparator />}
    </>
  )
}
