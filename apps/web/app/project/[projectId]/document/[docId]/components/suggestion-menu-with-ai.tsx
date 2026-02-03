import { filterSuggestionItems } from "@blocknote/core/extensions";
import { CustomBlockNoteEditor } from "./custom-blocks/schema";

import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from "@blocknote/react";
import { getAISlashMenuItems } from "@blocknote/xl-ai";

export function SuggestionMenuWithAI(props: {
  editor: CustomBlockNoteEditor;
}) {

  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(props.editor),
            ...getAISlashMenuItems(props.editor),
          ],

          query,
        )
      }
    />
  );
}
