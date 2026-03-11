import { memo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Position } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

import type { TSimulationEdgeRole } from '../lib/schemaToNodes';

interface RelationEdgeData {
  nullable?: boolean;
  isUnique?: boolean;
  onDelete?: string;
  onUpdate?: string;
  showPolicies?: boolean;
  simulationRole?: TSimulationEdgeRole;
  sourceTableName?: string;
  targetTableName?: string;
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
        <line x1="4" y1="0" x2="-3" y2="-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="0" x2="-3" y2="0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="0" x2="-3" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {nullable ? (
          <circle cx="-7" cy="0" r="3" fill="var(--background, #fff)" stroke={color} strokeWidth="1.5" />
        ) : (
          <line x1="-5" y1="-6" x2="-5" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

/**
 * Crow's Foot "zero-or-one" marker: O|
 */
function ZeroOrOneMarker({ x, y, position, color }: {
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
      <svg width="20" height="16" viewBox="-10 -8 20 16" style={{ transform: `rotate(${deg}deg)` }}>
        <line x1="-2" y1="-5" x2="-2" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="-7" cy="0" r="3" fill="var(--background, #fff)" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/** Build a human-readable relationship description from edge data */
function buildRelationshipGuide(
  sourceTable: string,
  targetTable: string,
  nullable: boolean,
  isUnique: boolean,
  onDelete?: string,
  onUpdate?: string,
): string[] {
  let cardinality: string;
  let sourceDesc: string;
  let targetDesc: string;

  if (isUnique && !nullable) {
    cardinality = '1';
    sourceDesc = `Each ${sourceTable} must reference exactly one ${targetTable}`;
    targetDesc = `Each ${targetTable} has exactly one ${sourceTable}`;
  } else if (isUnique && nullable) {
    cardinality = '0..1';
    sourceDesc = `Each ${sourceTable} may reference one ${targetTable} (optional)`;
    targetDesc = `Each ${targetTable} has at most one ${sourceTable}`;
  } else if (!nullable) {
    cardinality = '1..N';
    sourceDesc = `Each ${sourceTable} must reference exactly one ${targetTable}`;
    targetDesc = `One ${targetTable} can have 1 or N ${sourceTable}`;
  } else {
    cardinality = '0..N';
    sourceDesc = `Each ${sourceTable} may reference one ${targetTable} (optional)`;
    targetDesc = `One ${targetTable} can have 0 or N ${sourceTable}`;
  }

  const lines: string[] = [
    `${targetTable} (1) ── (${cardinality}) ${sourceTable}`,
    '',
    sourceDesc,
    targetDesc,
  ];
  if (onDelete || onUpdate) {
    lines.push('');
    if (onDelete) lines.push(`ON DELETE ${onDelete}: ${describeAction(onDelete, 'deleted')}`);
    if (onUpdate) lines.push(`ON UPDATE ${onUpdate}: ${describeAction(onUpdate, 'updated')}`);
  }
  return lines;
}

function describeAction(action: string, verb: string): string {
  switch (action) {
    case 'CASCADE': return `If ${verb}, child rows are also ${verb}`;
    case 'SET NULL': return `If ${verb}, FK columns become NULL`;
    case 'RESTRICT': return `Prevents ${verb.replace('d', '')} if child rows exist`;
    case 'NO ACTION': return `Deferred check, same as RESTRICT`;
    default: return action;
  }
}

/**
 * Build an SVG path for a self-referencing edge (loop).
 * The loop goes: right from source → up → arc → left → down to target.
 */
function getSelfLoopPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): { path: string; labelX: number; labelY: number } {
  const loopWidth = 60;
  const loopHeight = 50;

  // Determine if source is above or below target; loop goes up from higher point
  const midY = Math.min(sourceY, targetY);
  const topY = midY - loopHeight;

  const path = [
    `M ${sourceX},${sourceY}`,
    `L ${sourceX + loopWidth * 0.3},${sourceY}`,
    `Q ${sourceX + loopWidth},${sourceY} ${sourceX + loopWidth},${topY + loopHeight * 0.4}`,
    `Q ${sourceX + loopWidth},${topY} ${sourceX + loopWidth * 0.5},${topY}`,
    `L ${targetX - loopWidth * 0.5},${topY}`,
    `Q ${targetX - loopWidth},${topY} ${targetX - loopWidth},${topY + loopHeight * 0.4}`,
    `Q ${targetX - loopWidth},${targetY} ${targetX - loopWidth * 0.3},${targetY}`,
    `L ${targetX},${targetY}`,
  ].join(' ');

  const labelX = (sourceX + targetX) / 2;
  const labelY = topY - 8;

  return { path, labelX, labelY };
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
  const edgeData = data as RelationEdgeData | undefined;
  const nullable = edgeData?.nullable ?? true;
  const isUnique = edgeData?.isUnique ?? false;
  const showPolicies = edgeData?.showPolicies ?? true;
  const onDelete = edgeData?.onDelete;
  const onUpdate = edgeData?.onUpdate;
  const hasPolicies = showPolicies && (!!onDelete || !!onUpdate);
  const simRole = edgeData?.simulationRole ?? null;
  const sourceTableName = edgeData?.sourceTableName as string | undefined;
  const targetTableName = edgeData?.targetTableName as string | undefined;

  const isSelfLoop = sourceTableName != null && sourceTableName === targetTableName;

  const labelRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const strokeColor = simRole === 'active'
    ? '#f97316'
    : simRole === 'unaffected'
      ? 'hsl(var(--muted-foreground))'
      : isSelfLoop
        ? '#a855f7'
        : selected
          ? 'hsl(var(--primary))'
          : 'hsl(var(--muted-foreground))';
  const strokeWidth = simRole === 'active' ? 3 : simRole === 'unaffected' ? 1 : isSelfLoop ? 2 : selected ? 2 : 1.5;
  const strokeOpacity = simRole === 'unaffected' ? 0.15 : 1;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isSelfLoop) {
    const selfLoop = getSelfLoopPath(sourceX, sourceY, targetX, targetY);
    edgePath = selfLoop.path;
    labelX = selfLoop.labelX;
    labelY = selfLoop.labelY;
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    });
  }

  // Marker positions
  const markerOffset = 10;
  const srcOff = getOffset(sourcePosition, markerOffset);
  const tgtOff = getOffset(targetPosition, markerOffset);

  const guideLines = sourceTableName && targetTableName
    ? buildRelationshipGuide(sourceTableName, targetTableName, nullable, isUnique, onDelete, onUpdate)
    : null;

  function handleMouseEnter() {
    if (!labelRef.current || !guideLines) return;
    const rect = labelRef.current.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
  }

  function handleMouseLeave() {
    setTooltipPos(null);
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: simRole === 'active' ? undefined : isSelfLoop ? undefined : '5 3',
          opacity: strokeOpacity,
          transition: 'all 0.3s ease',
        }}
      />
      <EdgeLabelRenderer>
        {/* Source side (FK table): marker depends on isUnique + nullable */}
        {isUnique ? (
          nullable ? (
            <ZeroOrOneMarker
              x={sourceX + srcOff.x}
              y={sourceY + srcOff.y}
              position={sourcePosition}
              color={strokeColor}
            />
          ) : (
            <OneMarker
              x={sourceX + srcOff.x}
              y={sourceY + srcOff.y}
              position={sourcePosition}
              color={strokeColor}
            />
          )
        ) : (
          <ManyMarker
            x={sourceX + srcOff.x}
            y={sourceY + srcOff.y}
            position={sourcePosition}
            color={strokeColor}
            nullable={nullable}
          />
        )}
        {/* Target side (PK table): always "one" marker */}
        <OneMarker
          x={targetX + tgtOff.x}
          y={targetY + tgtOff.y}
          position={targetPosition}
          color={strokeColor}
        />
      </EdgeLabelRenderer>
      {/* Label & self-join badge */}
      <EdgeLabelRenderer>
        <div
          ref={labelRef}
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className={`rounded border px-1.5 py-0.5 shadow-sm ${
            isSelfLoop
              ? 'border-purple-400/50 bg-purple-500/10'
              : 'border-border/50 bg-background/95'
          }`}>
            {isSelfLoop && (
              <div className="text-[9px] font-bold text-purple-500 text-center tracking-wider mb-0.5">
                SELF
              </div>
            )}
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
        </div>
      </EdgeLabelRenderer>
      {/* Portal tooltip */}
      {tooltipPos && guideLines && createPortal(
        <div
          className="whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 shadow-lg"
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {isSelfLoop && (
            <div className="mb-1 flex items-center gap-1">
              <span className="inline-block rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-500">
                Self-Referencing
              </span>
            </div>
          )}
          {guideLines.map((line, i) =>
            line === '' ? (
              <div key={i} className="h-1" />
            ) : i === 0 ? (
              <div key={i} className="text-xs font-semibold text-foreground">{line}</div>
            ) : (
              <div key={i} className="text-[10px] text-muted-foreground">{line}</div>
            ),
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeComponent);
