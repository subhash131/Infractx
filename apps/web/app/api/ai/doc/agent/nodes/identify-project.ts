
import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, callAI, ChatMessage } from "../index";
import { getProjectInfo, listProjectsByUser } from "../context-tools";

export async function identifyProject(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
    console.log("🔍 Identifying project...");

    const { projectId, userMessage } = state;

    let effectiveProjectId = projectId;

    // 1. If we already have a project, use AI to detect if user wants to switch projects
    if (projectId) {
        const switchPrompt = `
        User Request: "${userMessage}"
        
        TASK: Determine if the user is asking to switch, change, or select a different project.
        Respond true if the user implies they want to work on a different project context.
        
        Return ONLY valid JSON:
        {
            "intentToSwitch": true/false
        }
        `;

        try {
            const messages: ChatMessage[] = [{ role: "user" as const, content: switchPrompt }];
            const response = await callAI(messages, { returnJson: true, config });
            
            if (response.intentToSwitch) {
                console.log("🔄 Project switch detected by AI");
                effectiveProjectId = ""; // Force lookup
            }
        } catch (e) {
            console.error("Failed to detect project switch intent:", e);
        }
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
    const token = config.configurable?.token;
    const projects = await listProjectsByUser("org_123", token);
    
    if (projects.length === 0) {
        return { error: "No projects found. Please create a project first." };
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

        // 5. If ambiguous or none — return a request_user_input operation.
        // The frontend shows a project picker and re-submits with the chosen projectId.
        console.log("❓ Project ambiguous, asking user...");
        return {
            operations: [{
                type: "request_user_input",
                position: 0,
                content: {
                    type: "project_selection",
                    options: projects.map((p: any) => ({ label: p.name, value: p.id })),
                    message: "I found multiple projects. Which one would you like to use?"
                }
            }]
        };

    } catch (e) {
        console.error("Project identification failed:", e);
    }

    return { error: "Could not identify project." };
}
