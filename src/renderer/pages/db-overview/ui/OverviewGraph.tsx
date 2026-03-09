import { useMemo, useCallback, useState } from 'react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { IConnection, IDiagram, ISeedFile } from '~/shared/types/db';
import { OverviewNode } from './OverviewNode';
import type { OverviewNodeData } from './OverviewNode';

interface OverviewGraphProps {
  connections: IConnection[];
  diagrams: IDiagram[];
  seeds: ISeedFile[];
}

const nodeTypes = { overviewNode: OverviewNode };

const COLOR_MAP: Record<string, string> = {
  connection: 'bg-blue-600',
  package: 'bg-green-600',
  diagram: 'bg-purple-600',
  snapshot: 'bg-yellow-600',
  seed: 'bg-orange-600',
  validation: 'bg-teal-600',
};

function buildGraph(
  connections: IConnection[],
  diagrams: IDiagram[],
  seeds: ISeedFile[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const COL_WIDTH = 240;
  const ROW_HEIGHT = 100;

  // Row 0: Connections
  connections.forEach((conn, i) => {
    nodes.push({
      id: `conn-${conn.id}`,
      type: 'overviewNode',
      position: { x: i * COL_WIDTH, y: 0 },
      data: {
        label: conn.name,
        type: 'Connection',
        details: `${conn.dbType} - ${conn.host}:${conn.port}`,
        color: COLOR_MAP.connection,
        resourceType: 'connection',
      } satisfies OverviewNodeData,
    });
  });

  // Row 1: Diagrams
  const virtualDiagrams = diagrams.filter((d) => d.type === 'virtual');
  virtualDiagrams.forEach((diagram, i) => {
    const nodeId = `diag-${diagram.id}`;
    nodes.push({
      id: nodeId,
      type: 'overviewNode',
      position: { x: i * COL_WIDTH, y: ROW_HEIGHT * 1.5 },
      data: {
        label: diagram.name,
        type: 'Diagram',
        details: `${diagram.tables?.length ?? 0} tables · v${diagram.version ?? '1'}`,
        color: COLOR_MAP.diagram,
        resourceType: 'diagram',
      } satisfies OverviewNodeData,
    });

    // Connect diagram to its connection if present
    if (diagram.connectionId) {
      edges.push({
        id: `e-conn-${diagram.connectionId}-diag-${diagram.id}`,
        source: `conn-${diagram.connectionId}`,
        target: nodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'var(--color-border)' },
      });
    }
  });

  // Row 2: Seeds
  seeds.forEach((seed, i) => {
    const nodeId = `seed-${seed.id}`;
    nodes.push({
      id: nodeId,
      type: 'overviewNode',
      position: { x: i * COL_WIDTH, y: ROW_HEIGHT * 3 },
      data: {
        label: seed.name,
        type: 'Seed',
        details: `${seed.targetTables?.length ?? 0} tables`,
        color: COLOR_MAP.seed,
        resourceType: 'seed',
      } satisfies OverviewNodeData,
    });

    // Connect seeds to diagrams that contain matching tables
    for (const diagram of virtualDiagrams) {
      const diagramTableNames = new Set((diagram.tables ?? []).map((t) => t.name));
      const hasOverlap = (seed.targetTables ?? []).some((t) => diagramTableNames.has(t));
      if (hasOverlap) {
        edges.push({
          id: `e-diag-${diagram.id}-seed-${seed.id}`,
          source: `diag-${diagram.id}`,
          target: nodeId,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: 'var(--color-border)' },
          animated: true,
        });
      }
    }
  });

  return { nodes, edges };
}

export function OverviewGraph({ connections, diagrams, seeds }: OverviewGraphProps) {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const { nodes, edges } = useMemo(
    () => buildGraph(connections, diagrams, seeds),
    [connections, diagrams, seeds],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: highlightedIds.has(edge.source) || highlightedIds.has(edge.target) ? 2 : 1,
          opacity: highlightedIds.size === 0 || highlightedIds.has(edge.source) || highlightedIds.has(edge.target) ? 1 : 0.3,
        },
      })),
    [edges, highlightedIds],
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        style: {
          opacity: highlightedIds.size === 0 || highlightedIds.has(node.id) ? 1 : 0.4,
          transition: 'opacity 0.15s ease',
        },
      })),
    [nodes, highlightedIds],
  );

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const connectedIds = new Set<string>([node.id]);
      for (const edge of edges) {
        if (edge.source === node.id) connectedIds.add(edge.target);
        if (edge.target === node.id) connectedIds.add(edge.source);
      }
      setHighlightedIds(connectedIds);
    },
    [edges],
  );

  const onNodeMouseLeave = useCallback(() => {
    setHighlightedIds(new Set());
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          No resources yet. Create connections and diagrams to see the resource graph.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[400px] rounded-lg border border-border">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        zoomOnScroll
        panOnDrag
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
