
import { AgentStateAnnotation } from "../index";
import { ChatGroq } from "@langchain/groq";
import { RunnableConfig } from "@langchain/core/runnables";

const groq = new ChatGroq({model:"openai/gpt-oss-120b"});

export async function explainContext(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
    console.log("💡 Explaining context...");
    const { fetchedContext, userMessage } = state;

    const prompt = `
    You are an expert AI assistant helping a developer or user understand their project.
    
    User Query: "${userMessage}"
    
    Retrieved Project Context:
    ${fetchedContext.slice(0, 15000)} // Limit context size
    
    TASK: Answer the user's query based STRICTLY on the provided context.
    
    GUIDELINES:
    - If explaining a schema, cite specific fields and types found in the context.
    - If listing files, list them clearly.
    - If the context doesn't contain the answer, say so.
    - Be concise and technical if the data looks like code/schema.
    - Format usage of field names or code in \`backticks\`.
    
    Response:
    `;

    const stream = await groq.stream([
        { role: "user", content: prompt }
    ], { ...config, tags: ['chat_stream'] });

    let finalResponse = "";
    
    for await (const chunk of stream) {
        if (typeof chunk.content === "string") {
            finalResponse += chunk.content;
        }
    }

    return {
        operations: [{
            type: 'chat_response',
            position: 0,
            content: finalResponse
        }]
    };
}
