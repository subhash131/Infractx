import { AgentStateAnnotation, callAI } from "../index";

export async function extractSchemaData(state: typeof AgentStateAnnotation.State) {
  console.log("📊 Extracting schema data...");
  
  const prompt = `Extract database schema fields from:

  ${state.userMessage}

  Analyze ALL requirements and infer the complete schema.

  Return ONLY valid JSON:
  {
    "tableName": "users",
    "fields": [
      {
        "name": "id",
        "type": "UUID",
        "description": "Primary key identifier"
      },
      {
        "name": "email",
        "type": "VARCHAR(255)",
        "description": "User email (unique, indexed)"
      }
    ]
  }

  Important:
  - Infer fields from requirements (e.g., "role-based access" → role field)
  - Include auth fields (password_hash, oauth fields if OAuth mentioned)
  - Include timestamps if mentioned (created_at, updated_at)
  - Include soft delete field (deleted_at) if mentioned
  - Include status/state fields
  - Be specific with types (UUID, VARCHAR with length, ENUM, TIMESTAMP, etc.)
  - Mention constraints in description (unique, indexed, not null, etc.)`;

  try {
    const result = await callAI(prompt, { returnJson: true });
    
    return {
      extractedData: result
    };
  } catch (error) {
    console.error("Schema extraction failed:", error);
    return {
      error: "Failed to extract schema data"
    };
  }
}
