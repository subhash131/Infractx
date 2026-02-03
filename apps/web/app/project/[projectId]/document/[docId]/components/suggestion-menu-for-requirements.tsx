import { BlockIdentifier } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import {  CustomBlockNoteEditor } from "./custom-blocks/schema";

export function SuggestionMenuForRequirements(props: {
  editor: CustomBlockNoteEditor;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="@"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            functionSuggestion(props),
            classSuggestion(props)
          ],
          query,
        )
      }
      
    />
  );
}




const  classSuggestion= (props: {
  editor: CustomBlockNoteEditor;
}) =>{
   return {
          title: "class",
          onItemClick: () => {
            const currentBlock = props.editor.getTextCursorPosition().block;
            if (!currentBlock) return;
            const insertedBlocks = props.editor.insertBlocks ([
              {
                type: "paragraph",
                content: "@class:", 
                children:[
                  {
                    type: "paragraph",
                    content: "", 
                  },
                  {
                    type: "paragraph",
                    content: "@function:", 
                    children:[
                      {
                        type: "paragraph",
                        content: "", 
                      }
                    ]
                  }
                ]
              }
            ], currentBlock, "after");

            if(insertedBlocks.length > 0){
              props.editor.setTextCursorPosition(insertedBlocks[0] as BlockIdentifier, "end");
            }
          },
      }
 }
const  functionSuggestion= (props: {
  editor:  CustomBlockNoteEditor;
}) =>{
   return {
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
                  }
                ]
              }
            ], currentBlock, "after");

            if(insertedBlocks.length > 0){
              props.editor.setTextCursorPosition(insertedBlocks[0] as BlockIdentifier, "end");
            }
          },
      }
 }