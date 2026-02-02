import { BlockIdentifier, BlockNoteEditor } from "@blocknote/core";
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
              title: "function",
              onItemClick: () => {
                const currentBlock = props.editor.getTextCursorPosition().block;
                if (!currentBlock) return;
                const insertedBlocks = props.editor.insertBlocks ([
                  {
                    type: "paragraph",
                    content: "@function:", 
                    children:[
                      {
                        type: "paragraph",
                        content: "", 
                        props:{
                          rank: "a0",
                        }
                      }
                    ]
                  }
                ], currentBlock, "after");

                if(insertedBlocks.length > 0){
                  props.editor.setTextCursorPosition(insertedBlocks[0] as BlockIdentifier, "end");
                }
              },
            },
          ],
          query,
        )
      }
    />
  );
}
