import { Button } from "../../tiptap-ui-primitive/button"
import { ToolbarGroup, ToolbarSeparator } from "../../tiptap-ui-primitive/toolbar"
import { ColorHighlightPopoverContent } from "../../tiptap-ui/color-highlight-popover"
import { LinkContent } from "../../tiptap-ui/link-popover"
import { ArrowLeftIcon, HighlighterIcon, LinkIcon } from "lucide-react"

export const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)