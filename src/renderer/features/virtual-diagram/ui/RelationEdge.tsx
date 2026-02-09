import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

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

  const strokeColor = selected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: '5 3',
        }}
      />
      {/* Cardinality markers */}
      <EdgeLabelRenderer>
        {/* Source side: N (many) */}
        <div
          className="nodrag nopan pointer-events-none text-[10px] font-bold"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY - 12}px)`,
            color: strokeColor,
          }}
        >
          N
        </div>
        {/* Target side: 1 (one) */}
        <div
          className="nodrag nopan pointer-events-none text-[10px] font-bold"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX}px,${targetY - 12}px)`,
            color: strokeColor,
          }}
        >
          1
        </div>
      </EdgeLabelRenderer>
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeComponent);
