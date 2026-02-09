import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import type { OnConnect, NodeMouseHandler, Node, XYPosition } from '@xyflow/react';
import type { ITable, IDiagram, IDiagramLayout, IDiagramFilter } from '~/shared/types/db';
import { schemaToNodes } from '../lib/schemaToNodes';
import { TableNode } from './TableNode';
import { RelationEdge } from './RelationEdge';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationEdge: RelationEdge };

interface DiagramCanvasProps {
  diagram: IDiagram;
  layout?: IDiagramLayout | null;
  filter: IDiagramFilter;
  readOnly?: boolean;
  highlightedTableIds?: string[];
  selectedTableId?: string | null;
  onTableSelect?: (tableId: string) => void;
  onTableUpdate?: (table: ITable) => void;
  onTableCreate?: (position: { x: number; y: number }) => void;
  onTableDelete?: (tableId: string) => void;
  onLayoutChange?: (layout: Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'>) => void;
  onEdgeCreate?: (sourceTableId: string, targetTableId: string) => void;
}

function DiagramCanvasInner({
  diagram,
  layout,
  filter,
  readOnly = false,
  highlightedTableIds = [],
  selectedTableId = null,
  onTableSelect,
  onTableCreate,
  onTableUpdate,
  onLayoutChange,
  onEdgeCreate,
}: DiagramCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const layoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      schemaToNodes(diagram.tables, {
        positions: layout?.positions,
        filter,
        highlightedTableIds,
        selectedTableId,
      }),
    [diagram.tables, layout?.positions, filter, highlightedTableIds, selectedTableId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when diagram/filter/highlights change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node: Node) => {
      onTableSelect?.(node.id);
    },
    [onTableSelect],
  );

  const handleNodeDragStop: NodeMouseHandler = useCallback(
    () => {
      if (readOnly || !onLayoutChange) return;

      if (layoutSaveTimer.current) {
        clearTimeout(layoutSaveTimer.current);
      }

      layoutSaveTimer.current = setTimeout(() => {
        const currentNodes = reactFlowInstance.getNodes();
        const positions: Record<string, { x: number; y: number }> = {};
        for (const node of currentNodes) {
          positions[node.id] = { x: node.position.x, y: node.position.y };
        }
        const viewport = reactFlowInstance.getViewport();
        onLayoutChange({
          positions,
          zoom: viewport.zoom,
          viewport: { x: viewport.x, y: viewport.y },
        });
      }, 1000);
    },
    [readOnly, onLayoutChange, reactFlowInstance],
  );

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      if (readOnly || !onEdgeCreate) return;
      if (connection.source && connection.target) {
        onEdgeCreate(connection.source, connection.target);
      }
    },
    [readOnly, onEdgeCreate],
  );

  const handlePaneClick = useCallback(() => {
    onTableSelect?.(null as unknown as string);
  }, [onTableSelect]);

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (readOnly || !onTableCreate) return;
      const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (!bounds) return;
      const position: XYPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onTableCreate(position);
    },
    [readOnly, onTableCreate, reactFlowInstance],
  );

  // Fit view to a specific node (called from parent via ref or store)
  useEffect(() => {
    if (selectedTableId) {
      const node = nodes.find((n) => n.id === selectedTableId);
      if (node) {
        reactFlowInstance.fitView({
          nodes: [node],
          duration: 300,
          padding: 0.5,
        });
      }
    }
  // Only trigger fitView when selectedTableId changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={readOnly ? undefined : onNodesChange}
      onEdgesChange={readOnly ? undefined : onEdgesChange}
      onConnect={handleConnect}
      onNodeClick={handleNodeClick}
      onNodeDragStop={handleNodeDragStop}
      onPaneClick={handlePaneClick}
      onDoubleClick={handlePaneDoubleClick}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable={!readOnly}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} />
      <Controls showInteractive={!readOnly} />
      <MiniMap
        zoomable
        pannable
        nodeStrokeWidth={3}
        className="!bg-background/80"
      />
    </ReactFlow>
  );
}

export function DiagramCanvas(props: DiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
