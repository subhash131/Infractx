import { AgentState, EditOperation } from "../state";

export const generateOperations = async (state: AgentState) => {
  const operations: EditOperation[] = [];

  if (state.intent === 'schema') {
    // Create SmartBlock
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        type: 'heading',
        level: 3,
        text: 'Schema: User'
      }
    });

    // Create Table
    operations.push({
      type: 'insert_table',
      position: state.cursorPosition + 1,
      content: {
        headers: ['Name', 'Type', 'Description'],
        rows: state.extractedData.map((field: any) => [
          field.name,
          field.type,
          field.description
        ])
      }
    });
  }

  return { ...state, operations };
};