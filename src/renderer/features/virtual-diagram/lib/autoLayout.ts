import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

interface AutoLayoutOptions {
  direction?: 'TB' | 'LR';
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Apply dagre layout to React Flow nodes and edges.
 * Returns new nodes with updated positions.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions = {},
): Node[] {
  const { direction = 'TB', rankSep = 80, nodeSep = 60 } = options;

  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: rankSep, nodesep: nodeSep });

  for (const node of nodes) {
    const width = (node.style?.width as number) ?? (node.measured?.width ?? 250);
    const height = node.measured?.height ?? 150;
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const width = (node.style?.width as number) ?? (node.measured?.width ?? 250);
    const height = node.measured?.height ?? 150;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });
}
