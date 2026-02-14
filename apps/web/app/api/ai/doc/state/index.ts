export interface AgentState {
  selectedText: string;
  userMessage: string;
  docContext: string; // surrounding content
  cursorPosition: number;
  intent: 'schema' | 'table' | 'list' | 'code' | 'text';
  extractedData: any;
  operations: EditOperation[];
}

export interface EditOperation {
  type: 'insert_smartblock' | 'insert_table' | 'replace' | 'delete';
  position: number; // where to insert/edit
  // content: SmartBlock | TableData | string;
  content: any;
}

// What the agent returns to frontend
export interface AgentResponse {
  success: boolean;
  operations: [
    {
      type: 'insert_smartblock',
      position: 42,
      content: {
        blockType: 'heading',
        level: 3,
        text: 'Schema: User'
      }
    },
    {
      type: 'insert_table',
      position: 43,
      content: {
        headers: ['Name', 'Type', 'Description'],
        rows: [
          ['id', 'UUID', 'Primary key identifier'],
          ['email', 'VARCHAR(255)', 'Unique user email'],
          ['password_hash', 'VARCHAR(255)', 'Bcrypt hashed password'],
          ['role', 'ENUM(admin,user)', 'Access control role'],
          ['name', 'VARCHAR(255)', 'User display name'],
          // ... more rows
        ],
        style: 'bordered' // optional styling hints
      }
    }
  ],
  metadata: {
    intent: 'schema',
    confidence: 0.95,
    processingTime: 234
  }
}