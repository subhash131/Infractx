import { SimpleEditor } from "./simple-editor/tiptap-templates/simple/simple-editor"
import { Id } from "@workspace/backend/_generated/dataModel"

export default function Editor({textFileId}:{textFileId:Id<"text_files">}) {
  return <SimpleEditor textFileId={textFileId} />
}