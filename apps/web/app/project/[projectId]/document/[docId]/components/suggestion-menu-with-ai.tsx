import { filterSuggestionItems } from "@blocknote/core/extensions";
import { CustomBlockNoteEditor } from "./custom-blocks/schema";
import { customSlashMenuItems } from "./custom-blocks/slash-menu-items";

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
            ...customSlashMenuItems.map((item) => ({
              ...item,
              onItemClick: () => item.onItemClick(props.editor),
              icon: <span>{item.icon}</span>,
            })),
          ],

          query,
        )
      }
    />
  );
}
