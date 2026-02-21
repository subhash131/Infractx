
import { Annotation, interrupt } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, callAI, ChatMessage } from "../index";
import { getProjectInfo, listProjectsByUser } from "../context-tools";

export async function identifyProject(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
    console.log("🔍 Identifying project...");

    const { projectId, userMessage, source } = state;

    // 1. If projectId matches "switch to project X" intent, clear current ID to force lookup
    const switchMatch = userMessage.match(/switch to project\s+(.+)/i);
    let effectiveProjectId = projectId;
    
    if (switchMatch) {
        console.log("🔄 Project switch requested:", switchMatch[1]);
        effectiveProjectId = ""; // Force lookup
    }

    // 2. If valid projectId exists, verify it and pass through
    if (effectiveProjectId) {
         const token = config.configurable?.token;
         const project = await getProjectInfo(effectiveProjectId, token);
         if (project) {
             console.log("✅ Project confirmed:", project.name);
             return { projectId: effectiveProjectId };
         }
         console.warn("⚠️ Invalid projectId:", effectiveProjectId);
    }

    // 3. List available projects
    // TODO: get org ID from user context/auth. Defaulting to a known org or fetching all.
    // For now, let's assume we can fetch projects for a default org or similar.
    const token = config.configurable?.token;
    const projects = await listProjectsByUser("org_123", token); 
    
    if (projects.length === 0) {
        return { 
            error: "No projects found. Please create a project first." 
        };
    }

    // 4. Use LLM to match user query to a project
    const prompt = `
    User Request: "${userMessage}"
    
    Available Projects:
    ${projects.map((p: any) => `- [${p.id}] ${p.name} (${p.description || "no desc"})`).join("\n")}
    
    TASK: Identify which project the user is referring to.
    
    RULES:
    - If the user explicitly names a project, select it.
    - If the user's request context implies a specific project, select it.
    - If multiple projects could match or it's ambiguous, return "AMBIGUOUS".
    - If no project matches, return "NONE".
    
    Return ONLY JSON:
    {
        "match": "PROJECT_ID" | "AMBIGUOUS" | "NONE",
        "reason": "explanation"
    }
    `;

    try {
        const messages: ChatMessage[] = [{ role: "user" as const, content: prompt }];
        const response = await callAI(messages, { returnJson: true, config });

        if (response.match && response.match !== "AMBIGUOUS" && response.match !== "NONE") {
             console.log("✅ Auto-selected project:", response.match);
             return { projectId: response.match };
        }
        
        // 5. If ambiguous or none, interrupt and ask user
        console.log("❓ Project ambiguous, asking user...");
        
        // Return Interrupt request
        // The graph will pause here. The frontend should see this state 
        // and present a project picker.
        // When resumed, the 'projectId' should be provided in the input.
        
        const userInput = interrupt({
            type: "project_selection",
            options: projects.map((p: any) => ({ label: p.name, value: p.id })),
            message: "I found multiple projects. Which one would you like to use?"
        });
        
        // When execution resumes, userInput will contain the selection
        if (userInput && userInput.value) {
             return { projectId: userInput.value };
        }

    } catch (e) {
        console.error("Project identification failed:", e);
    }

    return { error: "Could not identify project." };
}
