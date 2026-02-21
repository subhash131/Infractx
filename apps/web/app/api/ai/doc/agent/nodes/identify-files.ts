
import { interrupt } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, callAI, ChatMessage } from "../index";
import { getProjectInfo, listFiles } from "../context-tools";

export async function identifyFiles(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
    console.log("📂 Identifying files...");
    const { projectId, userMessage } = state;

    if (!projectId) return { error: "No project ID available." };

    // 1. Get project structure
    const token = config.configurable?.token;
    const project = await getProjectInfo(projectId, token);
    if (!project || !project.documents) return { error: "Project has no documents." };
    
    // 2. Flatten all files from all documents
    let allFiles: any[] = [];
    
    for (const doc of project.documents) {
        const files = await listFiles(doc._id, token);
        allFiles.push(...files.map((f: any) => ({
            ...f,
            documentTitle: doc.title
        })));
    }

    if (allFiles.length === 0) return { error: "No files found in project." };

    // 3. User LLM to pick relevant files
    const prompt = `
    User Request: "${userMessage}"
    
    Available Files:
    ${allFiles.map(f => `- [${f.id}] ${f.title} (in ${f.documentTitle})`).join("\n")}
    
    TASK: Identify which file(s) contain the information needed to answer the request.
    
    RULES:
    - Select ONLY files that are relevant.
    - If the user asks about "user schema", look for "schema", "models", "users", etc.
    - If the user asks "what files exist", return ALL files.
    - If specific files are named, select them.
    - If it's ambiguous, return "AMBIGUOUS".
    
    Return ONLY JSON:
    {
        "matches": ["FILE_ID_1", "FILE_ID_2"] | "AMBIGUOUS" | "ALL",
        "reason": "explanation"
    }
    `;

    try {
        const messages: ChatMessage[] = [{ role: "user", content: prompt }];
        const response = await callAI(messages, { returnJson: true, config });

        if (response.matches === "ALL") {
             return { targetFileIds: allFiles.map(f => f.id) };
        }

        if (Array.isArray(response.matches) && response.matches.length > 0) {
             console.log("✅ Auto-selected files:", response.matches);
             return { targetFileIds: response.matches };
        }

        // 4. If ambiguous, interrupt and ask
        console.log("❓ File selection ambiguous, asking user...");
        
        const userInput = interrupt({
            type: "file_selection",
            options: allFiles.map(f => ({ label: `${f.title} (${f.documentTitle})`, value: f.id })),
            message: "I'm not sure which file you're referring to. Please select one or more:"
        });

        if (userInput && userInput.value) {
             // Handle single or multiple selection (assuming value might be array or string)
             const ids = Array.isArray(userInput.value) ? userInput.value : [userInput.value];
             return { targetFileIds: ids };
        }


    } catch (e) {
        console.error("File identification failed:", e);
    }

    return { error: "Could not identify target files." };
}
