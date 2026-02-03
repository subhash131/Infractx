import { Block } from "@blocknote/core"
import { v4 as uuid } from "uuid"

export const getNewParagraphBlock = () => {
    const newBlockId = uuid()
    const block :Block = {
        id:newBlockId,
        type:"paragraph",
        content:[],
        children:[],
        props:{
            backgroundColor:"default",
            textColor:"default",
            textAlignment:"left"
        }
    }

    return block
}