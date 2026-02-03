import { BlockIdentifier } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import {  CustomBlockNoteEditor } from "./custom-blocks/schema";
import { getNewParagraphBlock } from "./utils/get-new-paragraph-block";

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
      const newBlock = getNewParagraphBlock()
      
      const insertedBlocks = props.editor.insertBlocks([
        {
          ...newBlock,
          content: "@context:",
          children: [getNewParagraphBlock()]
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
          ...getNewParagraphBlock(),
          content: "@schema:",
          children: [getNewParagraphBlock()]
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
          ...getNewParagraphBlock(),
          content: "@class:", 
          children: [getNewParagraphBlock()]
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
                ...getNewParagraphBlock(),
                content: "@function:", 
                children: [getNewParagraphBlock()]
              }
            ], currentBlock, "after");

            if(insertedBlocks.length > 0){
              props.editor.setTextCursorPosition(insertedBlocks[0] as BlockIdentifier, "end");
            }
          },
      }
 }