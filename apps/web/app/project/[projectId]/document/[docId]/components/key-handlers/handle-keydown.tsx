import { CustomBlockNoteEditor } from "../custom-blocks/schema";

export const handleKeyDown = (view:any, event:KeyboardEvent, editor:CustomBlockNoteEditor) => {
    if(event.key === "Enter"){
        const currentBlock = editor.getTextCursorPosition().block;
        if (!currentBlock) return false;
        const nextBlock = editor.getNextBlock(currentBlock.id);
        if(!nextBlock)return false
        
        const parentBlock = editor.getParentBlock(currentBlock.id);
          
        if (parentBlock) {
            const isInsideClassOrFunction =
                Array.isArray(parentBlock.content) &&
                parentBlock.content.some((item: any) =>
                    item?.text?.includes('@class') ||
                    item?.text?.includes('@function')
                );

            if (isInsideClassOrFunction) {
                event.preventDefault();
                event.stopPropagation();
                
                const newBlock = editor.insertBlocks(
                    [{ type: "paragraph", content: " " }],
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
    
    return false;
}