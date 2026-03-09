import { useEffect, useRef, useState } from 'react';
import { Trash2, RefreshCw, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import type { TSimulationType } from '../lib/cascadeTraversal';

interface NodeContextMenuProps {
  position: { x: number; y: number };
  tableName: string;
  referencedColumns: string[];
  onSimulate: (type: TSimulationType, columnName?: string) => void;
  onClose: () => void;
}

export function NodeContextMenu({ position, tableName, referencedColumns, onSimulate, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showColumnPicker) setShowColumnPicker(false);
        else onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, showColumnPicker]);

  const noIncomingRefs = referencedColumns.length === 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[260px] rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-2 py-1.5 text-xs font-semibold truncate">
        {tableName}
      </div>
      <div className="h-px bg-border my-0.5" />

      {noIncomingRefs ? (
        /* No other table references this table → cascade simulation is meaningless */
        <div className="flex items-start gap-2 px-2 py-2">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            다른 테이블이 이 테이블을 참조하지 않아<br />
            DELETE/UPDATE cascade 영향이 없습니다.
          </div>
        </div>
      ) : !showColumnPicker ? (
        <>
          {/* DELETE */}
          <button
            type="button"
            className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => { onSimulate('DELETE'); onClose(); }}
          >
            <Trash2 className="mt-0.5 size-4 shrink-0 text-red-500" />
            <div className="text-left">
              <div className="text-sm">DELETE Impact</div>
              <div className="text-[11px] text-muted-foreground">
                이 테이블의 행을 삭제하면 어떤 테이블이 영향받는지 확인
              </div>
            </div>
          </button>

          <div className="h-px bg-border my-0.5" />

          {/* UPDATE */}
          {referencedColumns.length === 1 ? (
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => { onSimulate('UPDATE', referencedColumns[0]); onClose(); }}
            >
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-teal-500" />
              <div className="text-left">
                <div className="text-sm">UPDATE Impact</div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">{referencedColumns[0]}</span> 컬럼 수정 시 영향 확인
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setShowColumnPicker(true)}
            >
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-teal-500" />
              <div className="flex-1 text-left">
                <div className="text-sm">UPDATE Impact</div>
                <div className="text-[11px] text-muted-foreground">
                  수정할 컬럼을 선택하세요 ({referencedColumns.length}개)
                </div>
              </div>
              <ChevronRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
            </button>
          )}
        </>
      ) : (
        <>
          {/* Column picker */}
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
            onClick={() => setShowColumnPicker(false)}
          >
            <ChevronLeft className="size-3.5" />
            뒤로
          </button>
          <div className="h-px bg-border my-0.5" />
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            수정할 컬럼 선택
          </div>
          {referencedColumns.map((col) => (
            <button
              key={col}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => { onSimulate('UPDATE', col); onClose(); }}
            >
              <RefreshCw className="size-4 text-teal-500" />
              <span className="font-mono">{col}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
