import type { Node } from '@xyflow/react';
import type { ITable } from '@/entities/table';
import type { TableNodeData } from '../ui/TableNode';

/**
 * Convert React Flow nodes back to ITable[].
 * Extracts table data from node data property.
 */
export function nodesToSchema(nodes: Node[]): ITable[] {
  return nodes
    .filter((node) => node.type === 'tableNode')
    .map((node) => {
      const data = node.data as unknown as TableNodeData;
      return data.table;
    });
}

/**
 * Extract node positions as a Record for layout persistence.
 */
export function extractPositions(nodes: Node[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  return positions;
}
