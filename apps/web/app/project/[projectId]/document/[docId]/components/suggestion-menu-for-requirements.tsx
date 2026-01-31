import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";

export function SuggestionMenuForRequirements(props: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="@"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            {
              title: "My Requirement",
              onItemClick: () => {
                // Inserts text at the current cursor position
                props.editor.insertInlineContent([
                  {
                    type: "text",
                    text: "Inserted Requirement!", // Added a space at the end for convenience
                  },
                ]);
              },
            },
          ],
          query,
        )
      }
    />
  );
}
