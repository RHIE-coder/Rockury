import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { ITable } from '~/shared/types/db';

interface AutoLayoutOptions {
  direction?: 'TB' | 'LR';
  rankSep?: number;
  nodeSep?: number;
  /** Pass tables to enable smart grouping (partition→parent, view→related) */
  tables?: ITable[];
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
 * Extract table names referenced in a SQL view definition (FROM / JOIN clauses).
 * Handles: FROM tbl, JOIN tbl, schema.tbl, "quoted_tbl", and aliases.
 */
function extractReferencedTables(sql: string): string[] {
  const names = new Set<string>();
  // Match FROM/JOIN followed by optional schema prefix and table name
  // Handles: FROM users, JOIN public.orders, LEFT JOIN "my_table" AS t
  const pattern = /(?:FROM|JOIN)\s+(?:"([^"]+)"|(\w+)\.(?:"([^"]+)"|(\w+))|"([^"]+)"|(\w+))/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    // Pick the first non-undefined capture group
    const name = match[1] ?? match[3] ?? match[4] ?? match[5] ?? match[6];
    if (name) names.add(name);
  }
  return [...names];
}

/**
 * Generate virtual edges to group related tables:
 * - Partition tables → parent table
 * - Views → tables referenced in their SQL definition (FROM/JOIN)
 * - Views fallback → tables referenced via column FKs
 */
function buildVirtualEdges(tables: ITable[], nodeIds: Set<string>): Edge[] {
  const virtualEdges: Edge[] = [];
  const tableNameToId = new Map<string, string>();
  for (const t of tables) {
    if (nodeIds.has(t.id)) tableNameToId.set(t.name, t.id);
  }

  for (const table of tables) {
    if (!nodeIds.has(table.id)) continue;

    // Partition → parent
    if (table.isPartition && table.parentTableName) {
      const parentId = tableNameToId.get(table.parentTableName);
      if (parentId) {
        virtualEdges.push({
          id: `__virtual_partition_${table.id}`,
          source: parentId,
          target: table.id,
        });
      }
    }

    // View → referenced tables
    if (table.isView) {
      const linked = new Set<string>();

      // Primary: parse SQL definition for FROM/JOIN tables
      if (table.viewDefinition) {
        const refNames = extractReferencedTables(table.viewDefinition);
        for (const refName of refNames) {
          const refId = tableNameToId.get(refName);
          if (refId && refId !== table.id && !linked.has(refId)) {
            linked.add(refId);
            virtualEdges.push({
              id: `__virtual_view_${table.id}_${refId}`,
              source: refId,
              target: table.id,
            });
          }
        }
      }

      // Fallback: column FK references
      for (const col of table.columns) {
        if (col.reference) {
          const refId = tableNameToId.get(col.reference.table);
          if (refId && !linked.has(refId)) {
            linked.add(refId);
            virtualEdges.push({
              id: `__virtual_view_${table.id}_${refId}`,
              source: refId,
              target: table.id,
            });
          }
        }
      }
    }
  }

  return virtualEdges;
}

/**
 * Smart auto-layout: handles disconnected subgraphs and isolated nodes.
 *
 * 1. Inject virtual edges for partition/view grouping
 * 2. Find connected components
 * 3. Apply dagre to each connected subgraph
 * 4. Arrange isolated nodes (no FK) in a compact grid
 * 5. Pack all groups together using column-based bin packing
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions = {},
): Node[] {
  if (nodes.length === 0) return [];

  const { direction = 'LR', rankSep = 220, nodeSep = 100, tables } = options;
  const fullOptions = { direction, rankSep, nodeSep };

  // Inject virtual edges for partition→parent and view→related grouping
  const nodeIds = new Set(nodes.map((n) => n.id));
  const virtualEdges = tables ? buildVirtualEdges(tables, nodeIds) : [];
  const allEdges = [...edges, ...virtualEdges];

  const components = findConnectedComponents(nodes, allEdges);

  // Separate isolated (single-node) vs connected components
  const isolatedNodes: Node[] = [];
  const connectedGroups: { nodes: Node[]; edges: Edge[] }[] = [];

  for (const comp of components) {
    if (comp.length === 1) {
      isolatedNodes.push(comp[0]);
    } else {
      const ids = new Set(comp.map((n) => n.id));
      const compEdges = allEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
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
