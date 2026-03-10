import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

interface AutoLayoutOptions {
  direction?: 'TB' | 'LR';
  rankSep?: number;
  nodeSep?: number;
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

function getNodeDimensions(node: Node): { width: number; height: number } {
  return {
    width: node.width ?? (node.style?.width as number) ?? node.measured?.width ?? 250,
    height: node.height ?? node.measured?.height ?? 150,
  };
}

/** Compute bounding box of a set of positioned nodes */
function computeBBox(nodes: Node[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Find connected components via BFS */
function findConnectedComponents(nodes: Node[], edges: Edge[]): Node[][] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) adjacency.set(id, new Set());

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }
  }

  const visited = new Set<string>();
  const components: Node[][] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const component: Node[] = [];
    const queue = [node.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      component.push(nodeMap.get(id)!);
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

/** Apply dagre to a single connected component and normalize to origin */
function layoutComponent(nodes: Node[], edges: Edge[], options: Required<AutoLayoutOptions>): Node[] {
  const { direction, rankSep, nodeSep } = options;

  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    edgesep: 40,
    ranker: 'network-simplex',
  });

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const result = nodes.map((node) => {
    const pos = g.node(node.id);
    const { width, height } = getNodeDimensions(node);
    return { ...node, position: { x: pos.x - width / 2, y: pos.y - height / 2 } };
  });

  // Normalize: shift so top-left is (0,0)
  const bbox = computeBBox(result);
  return result.map((n) => ({
    ...n,
    position: { x: n.position.x - bbox.minX, y: n.position.y - bbox.minY },
  }));
}

const GROUP_GAP = 160;
const ISOLATED_COLUMNS = 3;
const ISOLATED_GAP_X = 400;
const ISOLATED_GAP_Y = 60;

/**
 * Smart auto-layout: handles disconnected subgraphs and isolated nodes.
 *
 * 1. Find connected components
 * 2. Apply dagre to each connected subgraph
 * 3. Arrange isolated nodes (no FK) in a compact grid
 * 4. Pack all groups together using column-based bin packing
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions = {},
): Node[] {
  if (nodes.length === 0) return [];

  const { direction = 'LR', rankSep = 220, nodeSep = 100 } = options;
  const fullOptions = { direction, rankSep, nodeSep };

  const components = findConnectedComponents(nodes, edges);

  // Separate isolated (single-node) vs connected components
  const isolatedNodes: Node[] = [];
  const connectedGroups: { nodes: Node[]; edges: Edge[] }[] = [];

  for (const comp of components) {
    if (comp.length === 1) {
      isolatedNodes.push(comp[0]);
    } else {
      const ids = new Set(comp.map((n) => n.id));
      const compEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
      connectedGroups.push({ nodes: comp, edges: compEdges });
    }
  }

  // Layout each connected group
  const layoutedBlocks: { nodes: Node[]; bbox: BBox }[] = [];

  for (const group of connectedGroups) {
    const laid = layoutComponent(group.nodes, group.edges, fullOptions);
    layoutedBlocks.push({ nodes: laid, bbox: computeBBox(laid) });
  }

  // Sort blocks by height descending for better packing
  layoutedBlocks.sort((a, b) => b.bbox.height - a.bbox.height);

  // Layout isolated nodes as a compact grid block
  if (isolatedNodes.length > 0) {
    const gridNodes: Node[] = [];
    let colHeights = new Array(ISOLATED_COLUMNS).fill(0);

    // Sort isolated by height descending for balanced columns
    const sorted = [...isolatedNodes].sort((a, b) => {
      const ha = getNodeDimensions(a).height;
      const hb = getNodeDimensions(b).height;
      return hb - ha;
    });

    for (const node of sorted) {
      const { width, height } = getNodeDimensions(node);
      // Place in shortest column
      const col = colHeights.indexOf(Math.min(...colHeights));
      gridNodes.push({
        ...node,
        position: { x: col * ISOLATED_GAP_X, y: colHeights[col] },
      });
      colHeights[col] += height + ISOLATED_GAP_Y;
    }

    layoutedBlocks.push({ nodes: gridNodes, bbox: computeBBox(gridNodes) });
  }

  // Pack all blocks into columns (2 columns for large diagrams)
  const packColumns = layoutedBlocks.length > 3 ? 2 : 1;
  const columnHeights = new Array(packColumns).fill(0);
  const columnXOffsets = new Array(packColumns).fill(0);

  // Calculate column x positions based on max width per column
  // First pass: assign blocks to columns (shortest column first)
  const blockAssignments: { block: typeof layoutedBlocks[0]; col: number }[] = [];
  for (const block of layoutedBlocks) {
    const col = columnHeights.indexOf(Math.min(...columnHeights));
    blockAssignments.push({ block, col });
    columnHeights[col] += block.bbox.height + GROUP_GAP;
  }

  // Calculate max width per column
  const columnMaxWidth = new Array(packColumns).fill(0);
  for (const { block, col } of blockAssignments) {
    columnMaxWidth[col] = Math.max(columnMaxWidth[col], block.bbox.width);
  }

  // Calculate column x offsets
  let xAccum = 0;
  for (let c = 0; c < packColumns; c++) {
    columnXOffsets[c] = xAccum;
    xAccum += columnMaxWidth[c] + GROUP_GAP;
  }

  // Second pass: position blocks
  const finalColumnY = new Array(packColumns).fill(0);
  const allNodes: Node[] = [];

  for (const { block, col } of blockAssignments) {
    const offsetX = columnXOffsets[col];
    const offsetY = finalColumnY[col];

    for (const node of block.nodes) {
      allNodes.push({
        ...node,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      });
    }

    finalColumnY[col] += block.bbox.height + GROUP_GAP;
  }

  return allNodes;
}
