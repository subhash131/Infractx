import { Doc } from "@workspace/backend/_generated/dataModel";

export interface FileNode extends Doc<"text_files"> {
  children?: FileNode[];
}

/**
 * Tree item data structure for @headless-tree
 */
export interface TreeItemData {
  id: string;
  title: string;
  type: "FOLDER" | "FILE";
  childrenIds: string[];
}

/**
 * Parses a flat array of file/folder nodes into a hierarchical tree structure
 * @param flatArray - Array of file/folder nodes with optional parentId references
 * @returns Array of root nodes with nested children
 */
export function parseToTree(flatArray: FileNode[]): FileNode[] {
  // Create a map for quick lookup by _id
  const nodeMap = new Map<string, FileNode>();
  
  // Create a copy of each node and initialize children array
  flatArray.forEach((node) => {
    nodeMap.set(node._id, { ...node, children: [] });
  });

  // Root nodes (nodes without parentId)
  const rootNodes: FileNode[] = [];

  // Build the tree by linking children to parents
  flatArray.forEach((node) => {
    const currentNode = nodeMap.get(node._id)!;

    if (!node.parentId) {
      // This is a root node
      rootNodes.push(currentNode);
    } else {
      // This is a child node - add it to its parent's children array
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode) {
        parentNode.children!.push(currentNode);
      } else {
        // If parent doesn't exist, treat as root node
        rootNodes.push(currentNode);
      }
    }
  });

  // Sort children recursively (folders first, then alphabetically)
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      // Folders come before files
      if (a.type !== b.type) {
        return a.type === "FOLDER" ? -1 : 1;
      }
      // Within same type, sort alphabetically by title
      return a.title.localeCompare(b.title);
    }).map(node => {
      if (node.children && node.children.length > 0) {
        node.children = sortNodes(node.children);
      }
      return node;
    });
  };

  return sortNodes(rootNodes);
}

/**
 * Flattens a tree structure back into a flat array
 * @param tree - Array of root nodes with nested children
 * @returns Flat array of all nodes
 */
export function flattenTree(tree: FileNode[]): FileNode[] {
  const result: FileNode[] = [];

  const traverse = (nodes: FileNode[]) => {
    nodes.forEach((node) => {
      const { children, ...nodeWithoutChildren } = node;
      result.push(nodeWithoutChildren as FileNode);
      
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  };

  traverse(tree);
  return result;
}

/**
 * Finds a node in the tree by its _id
 * @param tree - Array of root nodes with nested children
 * @param id - The _id to search for
 * @returns The found node or undefined
 */
export function findNodeById(tree: FileNode[], id: string): FileNode | undefined {
  for (const node of tree) {
    if (node._id === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Gets all parent nodes for a given node
 * @param tree - Array of root nodes with nested children
 * @param targetId - The _id of the node to find parents for
 * @returns Array of parent nodes from root to immediate parent
 */
export function getNodePath(tree: FileNode[], targetId: string): FileNode[] {
  const path: FileNode[] = [];

  const findPath = (nodes: FileNode[], target: string): boolean => {
    for (const node of nodes) {
      if (node._id === target) {
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findPath(node.children, target)) {
          path.unshift(node);
          return true;
        }
      }
    }
    return false;
  };

  findPath(tree, targetId);
  return path;
}
