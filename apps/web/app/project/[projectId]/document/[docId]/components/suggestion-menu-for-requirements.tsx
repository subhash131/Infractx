import { BlockIdentifier } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import {  CustomBlockNoteEditor } from "./custom-blocks/schema";
import { v4 as uuid } from "uuid"

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
            classSuggestion(props),
            schemaSuggestion(props),
            customSuggestion(props),
          ],
          query,
        )
      }
      
    />
  );
}




const customSuggestion = (props: {
  editor: CustomBlockNoteEditor;
}) => {
  return {
    title: "Custom",
    onItemClick: () => {
      const currentBlock = props.editor.getTextCursorPosition().block;
      if (!currentBlock) return;
      
      const insertedBlocks = props.editor.insertBlocks([
        {
          id: uuid(),
          type: "paragraph",
          content: "@context:",
          children: [
            {
              id: uuid(),
              type: "paragraph",
              content: "", 
            }
          ]
        },
        
      ], currentBlock, "after");

      if(insertedBlocks.length > 0){
        props.editor.setTextCursorPosition(insertedBlocks[0] as BlockIdentifier, "end");
      }
    },
  }
}
const schemaSuggestion = (props: {
  editor: CustomBlockNoteEditor;
}) => {
  return {
    title: "Schema",
    onItemClick: () => {
      const currentBlock = props.editor.getTextCursorPosition().block;
      if (!currentBlock) return;
      
      const insertedBlocks = props.editor.insertBlocks([
        {
          id: uuid(),
          type: "paragraph",
          content: "@schema:",
          children: [
            {
              id: uuid(),
              type: "paragraph",
              content: "", 
            }
          ]
        },
        
      ], currentBlock, "after");

      if(insertedBlocks.length > 0){
        props.editor.setTextCursorPosition(insertedBlocks[0] as BlockIdentifier, "end");
      }
    },
  }
}
const classSuggestion = (props: {
  editor: CustomBlockNoteEditor;
}) => {
  return {
    title: "Class",
    onItemClick: () => {
      const currentBlock = props.editor.getTextCursorPosition().block;
      if (!currentBlock) return;
      
      const insertedBlocks = props.editor.insertBlocks([
        {
          id: uuid(),
          type: "paragraph",
          content: "@class:", 
          children: [
            {
              id: uuid(),
              type: "paragraph",
              content: "", 
            }
          ]
        },
        
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
          title: "Function",
          onItemClick: () => {
            const currentBlock = props.editor.getTextCursorPosition().block;
            if (!currentBlock) return;
            const insertedBlocks = props.editor.insertBlocks ([
              {
                id: uuid(),
                type: "paragraph",
                content: "@function:", 
                children:[
                  {
                    id: uuid(),
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