import { Block } from "@blocknote/core";
import { CustomBlockNoteEditor } from "../custom-blocks/schema";
import { v4 as uuid } from "uuid";

export const handleKeyDown = (view:any, event:KeyboardEvent, editor:CustomBlockNoteEditor) => {
    if(event.key === "Enter"){
        const currentBlock = editor.getTextCursorPosition().block;
        if (!currentBlock) return false;
        const nextBlock = editor.getNextBlock(currentBlock.id);

        const isFuncOrClass = Array.isArray(currentBlock.content) && ((currentBlock.content[0] as any)?.text?.startsWith('@class') || (currentBlock.content[0] as any)?.text?.startsWith('@function'))

        console.log({isFuncOrClass})
        
        if(isFuncOrClass){
            event.preventDefault();
            event.stopPropagation();
            if(currentBlock.children?.length){
                editor.setTextCursorPosition((currentBlock.children[0] as Block).id, "start");
            }
            return true;
        }
        
        const parentBlock = editor.getParentBlock(currentBlock.id);
        console.log({parentBlock})
        if (!parentBlock) return false; 
        if (parentBlock) {
            const isInsideClassOrFunction =
                Array.isArray(parentBlock.content) &&
                parentBlock.content.some((item: any) =>
                    item?.text?.includes('@class') ||
                    item?.text?.includes('@function')
                );
            const childCount = parentBlock.children?.length || 0;
            console.log({childCount})
            if(childCount <= 1){ 
                const newChildId = uuid();
                const newChild:Block = { 
                    type: "paragraph", 
                    content: [{type:"text",text:"",styles:{}}],
                    children:[],
                    id: newChildId,
                   props: {
                        backgroundColor: "default",
                        textColor: "default",
                        textAlignment: "left"
                    }
                };
  
                editor.updateBlock(parentBlock.id, { 
                    children: [...parentBlock.children, newChild] 
                });
  
                editor.setTextCursorPosition(newChildId, "start"); 
                return true; 
            }

            if (isInsideClassOrFunction) {
                event.preventDefault();
                event.stopPropagation();
                
                const newBlock = editor.insertBlocks(
                    [{ type: "paragraph", content: "" }],
                    currentBlock.id,
                    "after"
                );
                
                if(newBlock[0]?.id){
                    editor.setTextCursorPosition(newBlock[0].id, "start");
                }                
                return true;
            }
        }
       
        return false;
    }
    if(event.key === "Backspace"){
    console.log("Backspace")
    const currentBlock = editor.getTextCursorPosition().block;
    if (!currentBlock) return false;
    
    const parentBlock = editor.getParentBlock(currentBlock.id);
    const prevBlock = editor.getPrevBlock(currentBlock.id);

    const isFuncOrClassBlock = Array.isArray(currentBlock.content) &&
            currentBlock.content.some((item: any) =>
                item?.text?.startsWith('@class') ||
                item?.text?.startsWith('@function')
            );
    if(isFuncOrClassBlock){
        editor.removeBlocks([currentBlock.id]);
        return true;
    }
    
    if (parentBlock) {
        const isInsideClassOrFunction =
            Array.isArray(parentBlock.content) &&
            parentBlock.content.some((item: any) =>
                item?.text?.startsWith('@class') ||
                item?.text?.startsWith('@function')
            );

        if (isInsideClassOrFunction) {
            // Check if current block is empty
            const isEmpty = Array.isArray(currentBlock.content) && 
                           (currentBlock.content.length === 0 || 
                            (currentBlock.content[0]?.type === "text" && currentBlock.content[0].text.length === 0));

            if(isEmpty){
                if(prevBlock?.id){
                    editor.removeBlocks([currentBlock.id]);
                    editor.setTextCursorPosition(prevBlock.id, "end");
                }else{
                    editor.setTextCursorPosition(parentBlock.id, "end");
                }
                return true;
            }
            
            

         
            
            // Allow normal backspace within the block (not at start)
            return false;
        }
    }
   
    return false;
}
    
    return false;
}