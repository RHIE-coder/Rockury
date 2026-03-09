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
import type { OnConnect, NodeMouseHandler, Node, XYPosition, Viewport, NodeProps } from '@xyflow/react';
import type { ITable, IDiagram, IDiagramLayout, IDiagramFilter } from '~/shared/types/db';
import type { ICascadeResult } from '../lib/cascadeTraversal';
import type { ICompareResult } from '../lib/compareVersions';
import { schemaToNodes } from '../lib/schemaToNodes';
import { TableNode } from './TableNode';
import { RelationEdge } from './RelationEdge';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationEdge: RelationEdge };

// Stable default references to prevent useMemo invalidation on every render
const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_COLOR_MAP: Record<string, string> = {};

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
  hiddenTableIds?: string[];
  tableColors?: Record<string, string>;
  lockedNodeIds?: string[];
  onNodeLockToggle?: (nodeId: string) => void;
  onNodeDragStart?: (positions: Record<string, { x: number; y: number }>) => void;
  onNodeContextMenu?: (event: React.MouseEvent, tableId: string, tableName: string) => void;
  cascadeSimulation?: ICascadeResult | null;
  compareResult?: ICompareResult | null;
  /** Increment to trigger fitView (e.g., on compare mode entry) */
  fitViewTrigger?: number;
}

function DiagramCanvasInner({
  diagram,
  layout,
  filter,
  readOnly = false,
  highlightedTableIds = EMPTY_STRING_ARRAY,
  selectedTableId = null,
  onTableSelect,
  onTableCreate,
  onTableUpdate,
  onLayoutChange,
  onEdgeCreate,
  hiddenTableIds = EMPTY_STRING_ARRAY,
  tableColors = EMPTY_COLOR_MAP,
  lockedNodeIds = EMPTY_STRING_ARRAY,
  onNodeLockToggle,
  onNodeDragStart,
  onNodeContextMenu,
  cascadeSimulation = null,
  compareResult = null,
  fitViewTrigger = 0,
}: DiagramCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const layoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialViewportApplied = useRef(false);

  // Use ref for onTableUpdate to keep useMemo deps stable (callback doesn't affect node structure)
  const onTableUpdateRef = useRef(onTableUpdate);
  onTableUpdateRef.current = onTableUpdate;
  const stableOnTableUpdate = useCallback(
    (table: ITable) => onTableUpdateRef.current?.(table),
    [],
  );

  // Use ref for onNodeLockToggle to keep useMemo deps stable
  const onNodeLockToggleRef = useRef(onNodeLockToggle);
  onNodeLockToggleRef.current = onNodeLockToggle;
  const stableOnNodeLockToggle = useCallback(
    (id: string) => onNodeLockToggleRef.current?.(id),
    [],
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      schemaToNodes(diagram.tables, {
        positions: layout?.positions,
        filter,
        highlightedTableIds,
        selectedTableId,
        onTableUpdate: readOnly ? undefined : stableOnTableUpdate,
        hiddenTableIds,
        tableColors,
        lockedNodeIds,
        onNodeLockToggle: stableOnNodeLockToggle,
        cascadeSimulation,
        compareResult,
      }),
    [diagram.tables, layout?.positions, filter, highlightedTableIds, selectedTableId, readOnly, stableOnTableUpdate, hiddenTableIds, tableColors, lockedNodeIds, stableOnNodeLockToggle, cascadeSimulation, compareResult],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when diagram/filter/highlights change (preserve measured dimensions to avoid #015 warning)
  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return initialNodes.map((node) => {
        const existing = prevMap.get(node.id);
        return existing?.measured
          ? { ...node, measured: existing.measured }
          : node;
      });
    });
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node: Node) => {
      onTableSelect?.(node.id);
    },
    [onTableSelect],
  );

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node: Node) => {
      event.preventDefault();
      const tableData = node.data as { table?: { name?: string } };
      onNodeContextMenu?.(event as unknown as React.MouseEvent, node.id, tableData?.table?.name ?? node.id);
    },
    [onNodeContextMenu],
  );

  const handleNodeDragStartCb: NodeMouseHandler = useCallback(
    () => {
      if (readOnly || !onNodeDragStart) return;
      const currentNodes = reactFlowInstance.getNodes();
      const positions: Record<string, { x: number; y: number }> = {};
      for (const node of currentNodes) {
        positions[node.id] = { x: node.position.x, y: node.position.y };
      }
      onNodeDragStart(positions);
    },
    [readOnly, onNodeDragStart, reactFlowInstance],
  );

  const handleNodeDragStop: NodeMouseHandler = useCallback(
    () => {
      if (readOnly || !onLayoutChange) return;

      // Save immediately on drag stop (no debounce) to ensure cache is fresh before save
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

  // Double-click table creation removed — use "+ Table" button instead

  // Stable key tracking table ID set (changes on sync, add/remove table)
  const tableIdKey = useMemo(
    () => diagram.tables.map(t => t.id).join(','),
    [diagram.tables],
  );

  // Restore saved viewport on initial load
  useEffect(() => {
    if (isInitialViewportApplied.current) return;
    if (layout?.viewport && layout?.zoom) {
      reactFlowInstance.setViewport(
        { x: layout.viewport.x, y: layout.viewport.y, zoom: layout.zoom },
        { duration: 0 },
      );
      isInitialViewportApplied.current = true;
    } else if (nodes.length > 0) {
      reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      isInitialViewportApplied.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, nodes.length]);

  // Re-fit when table IDs change but saved positions are stale (e.g., after real schema sync)
  useEffect(() => {
    if (!isInitialViewportApplied.current) return;
    if (diagram.tables.length === 0) return;

    const hasMatchingPositions = layout?.positions &&
      diagram.tables.some(t => t.id in layout.positions);

    if (!hasMatchingPositions) {
      reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableIdKey]);

  // Fit view when triggered externally (e.g., entering compare mode)
  useEffect(() => {
    if (fitViewTrigger > 0) {
      // Small delay to let new nodes (ghost nodes) render first
      setTimeout(() => {
        reactFlowInstance.fitView({ duration: 400, padding: 0.15 });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitViewTrigger]);

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

  // Save viewport on pan/zoom changes
  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
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
        onLayoutChange({
          positions,
          zoom: viewport.zoom,
          viewport: { x: viewport.x, y: viewport.y },
        });
      }, 1000);
    },
    [readOnly, onLayoutChange, reactFlowInstance],
  );

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
      onNodeContextMenu={handleNodeContextMenu}
      onNodeDragStart={handleNodeDragStartCb}
      onNodeDragStop={handleNodeDragStop}
      onMoveEnd={handleMoveEnd}
      onPaneClick={handlePaneClick}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly && !!onEdgeCreate}
      elementsSelectable={!readOnly}
      minZoom={0.1}
      maxZoom={2}
      deleteKeyCode={null}
      defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} />
      <Controls showInteractive={false} />
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
