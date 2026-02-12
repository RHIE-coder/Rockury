import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Position } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

import type { TSimulationEdgeRole } from '../lib/schemaToNodes';

interface RelationEdgeData {
  nullable?: boolean;
  onDelete?: string;
  onUpdate?: string;
  simulationRole?: TSimulationEdgeRole;
  [key: string]: unknown;
}

const ROTATION: Record<Position, number> = {
  [Position.Right]: 0,
  [Position.Left]: 180,
  [Position.Top]: -90,
  [Position.Bottom]: 90,
};

function getOffset(position: Position, distance: number): { x: number; y: number } {
  switch (position) {
    case Position.Right: return { x: distance, y: 0 };
    case Position.Left: return { x: -distance, y: 0 };
    case Position.Top: return { x: 0, y: -distance };
    case Position.Bottom: return { x: 0, y: distance };
  }
}

/**
 * Crow's Foot "one" marker: ||
 * Two perpendicular bars indicating "exactly one".
 */
function OneMarker({ x, y, position, color }: {
  x: number; y: number; position: Position; color: string;
}) {
  const deg = ROTATION[position];
  return (
    <div
      className="nodrag nopan pointer-events-none"
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
      }}
    >
      <svg width="16" height="16" viewBox="-8 -8 16 16" style={{ transform: `rotate(${deg}deg)` }}>
        <line x1="-2" y1="-5" x2="-2" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-5" y1="-5" x2="-5" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Crow's Foot "many" marker with optional zero/one indicator.
 * nullable=true  → O< (zero-or-many): circle + crow's foot
 * nullable=false → |< (one-or-many): bar + crow's foot
 */
function ManyMarker({ x, y, position, color, nullable }: {
  x: number; y: number; position: Position; color: string; nullable: boolean;
}) {
  const deg = ROTATION[position];
  return (
    <div
      className="nodrag nopan pointer-events-none"
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
      }}
    >
      <svg width="24" height="18" viewBox="-12 -9 24 18" style={{ transform: `rotate(${deg}deg)` }}>
        {/* Crow's foot: three prongs converging at a point */}
        <line x1="4" y1="0" x2="-3" y2="-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="0" x2="-3" y2="0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="0" x2="-3" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {nullable ? (
          /* Zero circle */
          <circle cx="-7" cy="0" r="3" fill="var(--background, #fff)" stroke={color} strokeWidth="1.5" />
        ) : (
          /* One bar */
          <line x1="-5" y1="-6" x2="-5" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

function RelationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const edgeData = data as RelationEdgeData | undefined;
  const nullable = edgeData?.nullable ?? true;
  const onDelete = edgeData?.onDelete;
  const onUpdate = edgeData?.onUpdate;
  const hasPolicies = !!onDelete || !!onUpdate;
  const simRole = edgeData?.simulationRole ?? null;

  const strokeColor = simRole === 'active'
    ? '#f97316'
    : simRole === 'unaffected'
      ? 'hsl(var(--muted-foreground))'
      : selected
        ? 'hsl(var(--primary))'
        : 'hsl(var(--muted-foreground))';
  const strokeWidth = simRole === 'active' ? 3 : simRole === 'unaffected' ? 1 : selected ? 2 : 1.5;
  const strokeOpacity = simRole === 'unaffected' ? 0.15 : 1;

  // Offset markers along the edge direction so they sit on the line
  const markerOffset = 10;
  const srcOff = getOffset(sourcePosition, markerOffset);
  const tgtOff = getOffset(targetPosition, markerOffset);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: simRole === 'active' ? undefined : '5 3',
          opacity: strokeOpacity,
          transition: 'all 0.3s ease',
        }}
      />
      <EdgeLabelRenderer>
        {/* Source side (FK table): crow's foot "many" marker */}
        <ManyMarker
          x={sourceX + srcOff.x}
          y={sourceY + srcOff.y}
          position={sourcePosition}
          color={strokeColor}
          nullable={nullable}
        />
        {/* Target side (PK table): "one" marker */}
        <OneMarker
          x={targetX + tgtOff.x}
          y={targetY + tgtOff.y}
          position={targetPosition}
          color={strokeColor}
        />
      </EdgeLabelRenderer>
      {(label || hasPolicies) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto rounded border border-border/50 bg-background/95 px-1.5 py-0.5 shadow-sm"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label && (
              <div className="text-[10px] text-muted-foreground">{label}</div>
            )}
            {hasPolicies && (
              <div className="flex gap-2 text-[9px]">
                {onDelete && (
                  <span className="text-red-500 dark:text-red-400">D:{onDelete}</span>
                )}
                {onUpdate && (
                  <span className="text-blue-500 dark:text-blue-400">U:{onUpdate}</span>
                )}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeComponent);
