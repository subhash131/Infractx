import { CustomBlockNoteEditor } from "../custom-blocks/schema";
import { getNewParagraphBlock } from "../utils/get-new-paragraph-block";

export const handleKeyDown = (view:any, event:KeyboardEvent, editor:CustomBlockNoteEditor) => {

    if(event.key === "Enter"){
        const currentBlock = editor.getTextCursorPosition().block;
        if (!currentBlock) return false;
        //Handle Enter key press for parent blocks
        const isParentSpecialBlock = Array.isArray(currentBlock.content) && ((currentBlock.content[0] as any)?.text?.startsWith('@class') || (currentBlock.content[0] as any)?.text?.startsWith('@function') || (currentBlock.content[0] as any)?.text?.startsWith('@custom') || (currentBlock.content[0] as any)?.text?.startsWith('@schema'))   
        console.log({isParentSpecialBlock})     
        if(isParentSpecialBlock){
            const newBlock = getNewParagraphBlock()
           editor.updateBlock(currentBlock.id, {
            children:[newBlock,...currentBlock.children]
           })
           editor.setTextCursorPosition(newBlock.id, "start");
           return true;
        }

        const parentBlock = editor.getParentBlock(currentBlock.id);
        if (!parentBlock) return false; 

        const grandParentBlock = editor.getParentBlock(parentBlock.id);
        const isGrandParentSpecialBlock = grandParentBlock && (Array.isArray(grandParentBlock.content) && ((grandParentBlock.content[0] as any)?.text?.startsWith('@class') || (grandParentBlock.content[0] as any)?.text?.startsWith('@function') || (grandParentBlock.content[0] as any)?.text?.startsWith('@custom') || (grandParentBlock.content[0] as any)?.text?.startsWith('@schema')))
        console.log({isGrandParentSpecialBlock})     

        //Handle Enter key press for child blocks
        const isChildSpecialBlock = Array.isArray(parentBlock.content) && ((parentBlock.content[0] as any)?.text?.startsWith('@class') || (parentBlock.content[0] as any)?.text?.startsWith('@function') || (parentBlock.content[0] as any)?.text?.startsWith('@custom') || (parentBlock.content[0] as any)?.text?.startsWith('@schema'))   
        console.log({isChildSpecialBlock})     
        if(isChildSpecialBlock){
            const nextBlock = editor.getNextBlock(currentBlock.id)
            if(nextBlock?.id){
                editor.setTextCursorPosition(nextBlock?.id, "start");
                return true;
            }else{
                if(grandParentBlock){
                    const parentNextBlock = editor.getNextBlock(parentBlock.id)
                    console.log({
                        parentNextBlock
                    })
                    if(!parentNextBlock?.id){
                        editor.updateBlock(grandParentBlock.id, {
                            children:[...grandParentBlock.children,getNewParagraphBlock()]
                    })
                    }
                }
                const newBlock = getNewParagraphBlock()
                editor.updateBlock(parentBlock.id, {
                    children:[...parentBlock.children,newBlock]
                })
                editor.setTextCursorPosition(newBlock.id, "start");

                return true;
            }

           
        }

        
       

    }
    
    if(event.key === "Backspace"){
    console.log("Backspace")
    const currentBlock = editor.getTextCursorPosition().block;
    if (!currentBlock) return false;
    
    const parentBlock = editor.getParentBlock(currentBlock.id);
    const prevBlock = editor.getPrevBlock(currentBlock.id);

    const isSpecialBlock =
            Array.isArray(currentBlock.content) &&
            currentBlock.content.some((item: any) =>
                item?.text?.startsWith('@class') ||
                item?.text?.startsWith('@function') ||
                item?.text?.startsWith('@custom') ||
                item?.text?.startsWith('@schema')
            );
    const isAtStart = view.state.selection.$from.parentOffset 
    // delete entire block if disconnected from parent 
    if(isAtStart === 0 && isSpecialBlock){
        editor.removeBlocks([currentBlock.id]);
        return true;
    }

    
    if (parentBlock) {
        const isInsideSpecialBlock =
            Array.isArray(parentBlock.content) &&
            parentBlock.content.some((item: any) =>
                item?.text?.startsWith('@class') ||
                item?.text?.startsWith('@function') ||
                item?.text?.startsWith('@custom') ||
                item?.text?.startsWith('@schema')
            );
        if (isInsideSpecialBlock) {
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
            
            return false;
        }
    }
   
    return false;
    }
    
    return false;
}