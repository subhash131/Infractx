async function addFrame(query: string): Promise<string> {
  // Simulates a search tool
  console.log(`🔍 Searching for: ${query}`);
  return `Search results for "${query}": Found relevant information about ${query}!`;
}
