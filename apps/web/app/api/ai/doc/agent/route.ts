import { NextRequest, NextResponse } from "next/server"
import executeDocAgent from "./index";

export const POST = async (req:NextRequest) => {
    const {selectedText, userMessage, docContext, cursorPosition} = await req.json();

   const response = await executeDocAgent({
        selectedText,
        userMessage,
        docContext,
        cursorPosition,
    })
    return NextResponse.json({response})
}