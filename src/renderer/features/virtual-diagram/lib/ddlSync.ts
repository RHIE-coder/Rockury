import type { ITable } from '~/shared/types/db';
import type { TDbType } from '~/shared/types/db';
import { schemaToDdl } from '@/features/ddl-editor/lib/schemaToDdl';
import { parseDdl } from '@/features/ddl-editor/lib/ddlParser';

export type TChangeSource = 'canvas' | 'ddl' | 'external' | null;

/**
 * DDL ↔ Diagram bidirectional sync utility.
 * Uses changeSource tracking to prevent infinite loops.
 *
 * Flow:
 *   Canvas edit → setChangeSource('canvas') → generateDdl → DDL editor updates
 *   DDL edit   → setChangeSource('ddl')    → parseDdl    → Diagram updates
 */
export const ddlSync = {
  /**
   * Generate DDL from tables (Diagram → DDL direction).
   * Call this when canvas/diagram changes to update DDL editor.
   */
  generateDdl(tables: ITable[], dbType: TDbType = 'mysql'): string {
    return schemaToDdl(tables, dbType);
  },

  /**
   * Parse DDL into tables (DDL → Diagram direction).
   * Call this when DDL editor changes to update diagram.
   */
  parseDdlToTables(ddl: string): ITable[] {
    return parseDdl(ddl);
  },

  /**
   * Check if sync should proceed based on change source.
   * Prevents infinite loops by skipping sync when the change
   * originated from the opposite direction.
   */
  shouldSync(currentSource: TChangeSource, triggerDirection: 'canvas' | 'ddl'): boolean {
    if (currentSource === null) return true;
    // If change came from canvas, only allow canvas→DDL sync
    if (currentSource === 'canvas' && triggerDirection === 'canvas') return true;
    // If change came from DDL, only allow DDL→canvas sync
    if (currentSource === 'ddl' && triggerDirection === 'ddl') return true;
    // External changes always sync
    if (currentSource === 'external') return true;
    return false;
  },
};
