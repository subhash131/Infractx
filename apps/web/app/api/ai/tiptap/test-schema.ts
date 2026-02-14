import { invokeAgent } from "./agent";
import { v4 as uuidv4 } from "uuid";

async function testSchemaGen() {
  const query = `requirements
-Use UUID as primary key
-Support authentication (email + password, OAuth-ready)
-Include role-based access (admin, user, etc.)
-Store profile information (name, avatar)
-Include account status (active, suspended, deleted)
-Email must be unique
-Include timestamps (created_at, updated_at)
-Soft delete support
-Index commonly queried fields
-Follow best practices for security (hashed passwords)`;

  const projectId = "test_project";
  const threadId = uuidv4();

  console.log("Invoking agent with query:", query);

  const result = await invokeAgent({
    query,
    projectId,
    threadId,
  });

  console.log("Agent Result:", JSON.stringify(result, null, 2));
}

testSchemaGen().catch(console.error);
