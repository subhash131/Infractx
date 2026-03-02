# MCP Server Authentication Setup

This MCP server now includes full authentication support for accessing Convex DB. Users can securely authenticate using Clerk JWTs and access their data through the available tools.

## Architecture

### Authentication Flow

1. **Client Request** → Sends Clerk JWT in `Authorization: Bearer <token>` header
2. **Session Creation** → MCP creates a session and extracts user ID from JWT
3. **Tool Execution** → Tools check authentication before accessing Convex
4. **Convex Authorization** → Convex backend validates the JWT and enforces ownership rules

### Components

#### 1. JWT Verification (`verifyClerkJWT`)

- Decodes Clerk JWT tokens without strict verification (dev-friendly)
- Extracts the `sub` (subject/user ID) claim for identifying users
- Logs authentication status

#### 2. Session Management

- Each MCP session stores:
  - `userId`: Authenticated user's Clerk ID
  - `clerkToken`: The JWT token for Convex API calls
  - Creation time for cleanup

#### 3. Tool Authorization

All tools now check:

```typescript
if (!userId || !token) {
  return { isError: true, content: [...] };
}
```

#### 4. Convex Integration

Tools call Convex HTTP API with authentication:

```typescript
const response = await fetch(convexUrl, {
  headers: {
    Authorization: `Bearer ${token}`,
    ...
  },
  body: JSON.stringify({ path: functionName, args }),
});
```

## Available Tools

### `get_designs`

Fetches all design projects owned by the authenticated user.

**Requires:** Authentication

**Usage:**

```json
{
  "name": "get_designs",
  "arguments": {}
}
```

### `create_design`

Creates a new design project for the authenticated user.

**Requires:** Authentication

**Usage:**

```json
{
  "name": "create_design",
  "arguments": {
    "name": "My New Design",
    "description": "Optional description"
  }
}
```

### `demo_add`

Demo tool for testing (no auth required).

## Environment Configuration

Create a `.env` file in `apps/mcp/` with:

```env
# Convex Configuration
CONVEX_URL=https://scintillating-corgi-821.convex.cloud

# Clerk Authentication
CLERK_JWT_ISSUER_DOMAIN=https://heroic-egret-15.clerk.accounts.dev
```

See `.env.example` for template.

## Generating Auth Tokens

Users need a Clerk JWT token to authenticate with the MCP server. Here are the recommended methods:

### Method 1: From the Next.js Web App (Recommended)

The easiest way is to use the existing `generateUserToken()` function in your web app:

#### Backend (Server-Side)

```typescript
// apps/web/modules/auth/actions.ts
import { generateUserToken } from "@/modules/auth/actions";

// In a server action or API route
const token = await generateUserToken();
// Use this token to call the MCP server
```

#### Frontend (Client-Side)

```typescript
// In a Next.js component or API route
async function getMCPToken() {
  const response = await fetch("/api/auth/token", {
    method: "GET",
  });
  const { token } = await response.json();
  return token;
}

// Use the token
const token = await getMCPToken();
const sessionId = await initializeMCP(token);
```

Create an API route at `apps/web/app/api/auth/token/route.ts`:

```typescript
import { generateUserToken } from "@/modules/auth/actions";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await generateUserToken();
    return Response.json({ token });
  } catch (error) {
    return Response.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
```

### Method 2: Using Clerk Dashboard

For testing/development in Clerk's dashboard:

1. Go to **Clerk Dashboard** → Your app → **Sessions**
2. Find the session you want a token for
3. Click **View Session** → **JWT Token**
4. Copy the JWT and use it with the MCP server

### Method 3: Using Clerk SDK (Client-Side)

In a browser environment with Clerk installed:

```typescript
import { useAuth } from "@clerk/nextjs";

export function MCPClient() {
  const { getToken } = useAuth();

  async function callMCPTool(toolName: string, args: any) {
    const token = await getToken({ template: "convex" });

    if (!token) {
      throw new Error("Failed to get authentication token");
    }

    const response = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });

    return response.json();
  }

  return (
    <button onClick={() => callMCPTool("get_designs", {})}>
      Load Designs
    </button>
  );
}
```

### Method 4: Using Clerk's Session API (Backend)

For backend services:

```typescript
import { clerkClient } from "@clerk/nextjs/server";

async function getTokenForUser(userId: string) {
  const client = await clerkClient();

  // Get user sessions
  const sessions = await client.users.getUserSessions(userId);

  if (sessions.length === 0) {
    throw new Error("No active sessions for user");
  }

  // Get JWT for the first session
  const sessionId = sessions[0].id;
  const token = await client.sessions.getToken(
    sessionId,
    "convex", // Template name
  );

  return token;
}
```

### Method 5: Using Clerk Admin API (Server-to-Server)

For applications external to your stack:

```bash
# Get a Clerk API token
export CLERK_API_KEY="sk_live_..."

# Create a session and get a JWT
curl -X POST https://api.clerk.dev/v1/sessions \
  -H "Authorization: Bearer $CLERK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_xyz",
    "client_id": "your_client_id"
  }'
```

## Token Lifecycle

### Token Expiration

- Clerk JWTs expire based on your Clerk session settings (typically 1 hour)
- Include expiration check in your client code
- Request a new token if expired

### Token Refresh

```typescript
async function ensureValidToken(token: string) {
  const decoded = JSON.parse(atob(token.split(".")[1]));
  const expiresAt = decoded.exp * 1000;

  if (Date.now() > expiresAt - 60000) {
    // Refresh if within 1 min of expiry
    return await generateUserToken(); // Get a fresh token
  }

  return token;
}
```

### Session Cleanup

- MCP server sessions expire after 30 minutes of inactivity
- Start a new session by calling initialize again with a token

## Client Integration

To use the MCP server with authentication:

### 1. Initialize Session

```
POST http://localhost:3001/mcp
Authorization: Bearer <clerk-jwt>
Header: mcp-protocol-version: 2024-11-05

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  ...
}
```

**Response includes:**

- `mcp-session-id` header: Use this for subsequent requests
- Server capabilities

### 2. Call Authenticated Tools

```
POST http://localhost:3001/mcp
Authorization: Bearer <clerk-jwt>
Header: mcp-session-id: <session-id-from-init>

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_designs",
    "arguments": {}
  }
}
```

### 3. Session Cleanup

Sessions automatically expire after 30 minutes of inactivity.

## Security Notes

### Development Mode

- JWT verification is lenient (only checks format, not signature)
- Suitable for local development with Clerk

### Production Considerations

- Implement strict JWT signature verification using JWKS
- Use `jsonwebtoken` library with Clerk's public keys
- Add request rate limiting
- Store session data in Redis instead of memory
- Implement token refresh logic

### Data Access Control

Convex backend enforces:

- Users can only access their own designs (`ownerId` check)
- Organization access rules (when implemented)
- Proper error responses for unauthorized access

## Debugging

### Enable Verbose Logging

The server logs all authentication and tool calls with `[AUTH]`, `[SESSION]`, `[TOOL]`, and `[CONVEX]` prefixes.

### Common Issues

**"Authentication required" error**

- Ensure Bearer token is passed in Authorization header
- Verify token is valid Clerk JWT
- Check token hasn't expired

**"Session not found" error**

- Ensure `mcp-session-id` header matches the one from initialize
- Session may have expired (30 min timeout)

**"Convex API error" response**

- Check CONVEX_URL is correct
- Verify Convex database is accessible
- Check user has permissions in Convex schema

## Quick Start: Using the Example Client

See [client-example.ts](./client-example.ts) for a fully working example:

```bash
# Install dependencies (if needed)
pnpm install

# Run the MCP server
pnpm run dev

# In another terminal, run the example (from apps/mcp):
# Make sure your web app is also running first

# To use the example:
# 1. Uncomment the example function you want in client-example.ts
# 2. Run: node --loader tsx client-example.ts
```

The example shows:

- **Example 1**: Getting designs using token from web app API
- **Example 2**: Creating a new design with parameters
- **Example 3**: Testing with a manually provided token

pnpm install

# Run server

pnpm run dev

# Use MCP Inspector

pnpm run inspect

```

Pass the Clerk JWT when testing to activate authentication features.
```
