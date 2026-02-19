// =========================================
// Option 1: Generate Token from Web App
// =========================================

async function getTokenFromWebApp(
  webAppUrl: string = "http://localhost:3000",
): Promise<string> {
  /**
   * Assumes you have an API route at:
   * apps/web/app/api/auth/token/route.ts
   *
   * That exports:
   * export async function GET() {
   *   const token = await generateUserToken();
   *   return Response.json({ token });
   * }
   */
  const response = await fetch(`${webAppUrl}/api/auth/token`);

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

// =========================================
// Option 2: Manually Set Token (for testing)
// =========================================

function useManualToken(token: string): string {
  /**
   * For testing/development:
   * 1. Go to Clerk Dashboard
   * 2. Navigate to Sessions
   * 3. Copy a JWT token
   * 4. Pass it here
   */
  return token;
}

// =========================================
// MCP Client Implementation
// =========================================

interface MCPSession {
  sessionId: string;
  token: string;
  expiresAt: number;
}

class MCPClient {
  private mcpUrl: string;
  private session: MCPSession | null = null;
  private tokenGenerator: () => Promise<string>;

  constructor(
    mcpUrl: string = "http://localhost:3001/mcp",
    tokenGenerator: () => Promise<string>,
  ) {
    this.mcpUrl = mcpUrl;
    this.tokenGenerator = tokenGenerator;
  }

  /**
   * Initialize MCP session with authentication
   */
  async initialize(): Promise<void> {
    console.log("[MCP] Initializing session...");

    // Get a fresh token
    const token = await this.tokenGenerator();
    console.log("[MCP] Token obtained, length:", token.length);

    // Send initialize request with auth
    const response = await fetch(this.mcpUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "mcp-example-client",
            version: "1.0.0",
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Initialize failed: ${response.statusText}`);
    }

    const sessionId = response.headers.get("mcp-session-id");
    if (!sessionId) {
      throw new Error("No session ID in response");
    }

    // Calculate token expiration (Clerk JWTs typically last 1 hour)
    const expiresAt = Date.now() + 60 * 60 * 1000;

    this.session = { sessionId, token, expiresAt };
    console.log(`[MCP] Session initialized: ${sessionId}`);
  }

  /**
   * Ensure session is valid, refresh if needed
   */
  private async ensureSession(): Promise<void> {
    if (!this.session) {
      await this.initialize();
      return;
    }

    // Check if token is about to expire (within 5 minutes)
    if (Date.now() > this.session.expiresAt - 5 * 60 * 1000) {
      console.log("[MCP] Token expiring soon, refreshing session...");
      await this.initialize();
    }
  }

  /**
   * Call an authenticated tool
   */
  async callTool(
    toolName: string,
    args: Record<string, any> = {},
  ): Promise<any> {
    await this.ensureSession();

    if (!this.session) {
      throw new Error("No valid session");
    }

    console.log(`[MCP] Calling tool: ${toolName}`, args);

    const response = await fetch(this.mcpUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.session.token}`,
        "mcp-session-id": this.session.sessionId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Tool call failed: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result;
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any> {
    await this.ensureSession();

    if (!this.session) {
      throw new Error("No valid session");
    }

    const response = await fetch(this.mcpUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.session.token}`,
        "mcp-session-id": this.session.sessionId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    });

    if (!response.ok) {
      throw new Error(`List tools failed: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result;
  }
}

// =========================================
// Usage Examples
// =========================================

async function example1_GetDesignsFromWebApp() {
  console.log("\n=== Example 1: Get Designs (using web app token) ===\n");

  // Create client that gets token from web app
  const client = new MCPClient("http://localhost:3001/mcp", () =>
    getTokenFromWebApp("http://localhost:3000"),
  );

  try {
    await client.initialize();
    const result = await client.callTool("get_designs", {});
    console.log("Designs:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

async function example2_CreateDesign() {
  console.log("\n=== Example 2: Create Design ===\n");

  const client = new MCPClient("http://localhost:3001/mcp", () =>
    getTokenFromWebApp("http://localhost:3000"),
  );

  try {
    await client.initialize();
    const result = await client.callTool("create_design", {
      name: "My New Design",
      description: "Created via MCP client",
    });
    console.log("Created:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

async function example3_ManualToken() {
  console.log("\n=== Example 3: Manual Token (for testing) ===\n");

  // For testing: replace with actual Clerk JWT
  const testToken = process.env.CLERK_JWT || "your-clerk-jwt-here";

  const client = new MCPClient("http://localhost:3001/mcp", () =>
    Promise.resolve(testToken),
  );

  try {
    await client.initialize();
    const result = await client.callTool("get_designs", {});
    console.log("Designs:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

// =========================================
// Run Examples
// =========================================

async function main() {
  console.log("MCP Client with Authentication Examples\n");

  // Uncomment the example you want to run:

  // await example1_GetDesignsFromWebApp();
  // await example2_CreateDesign();
  // await example3_ManualToken();

  console.log("\nTo run examples:");
  console.log("1. Make sure MCP server is running: pnpm run dev");
  console.log("2. Make sure web app is running: pnpm run dev (in apps/web)");
  console.log("3. Uncomment the example you want in this file");
  console.log("4. Run: node --loader tsx client-example.ts");
}

main().catch(console.error);

export { MCPClient, getTokenFromWebApp, useManualToken };
