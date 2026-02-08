import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { schemaService, virtualDiagramService, diffService } from '#/services';
import type { ITable, TDbType, TDiagramType, IDiagramLayout } from '~/shared/types/db';

export function registerSchemaHandlers() {
  // ─── Diagram CRUD ───
  ipcMain.handle(CHANNELS.DIAGRAM_LIST, async (_event, args: { type?: TDiagramType }) => {
    try {
      // virtualDiagramService handles 'virtual' type; for all types, use it as passthrough
      const data = virtualDiagramService.list();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_GET, async (_event, args: { id: string }) => {
    try {
      const data = virtualDiagramService.getById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_CREATE, async (_event, args: { name: string; type: TDiagramType; tables?: ITable[] }) => {
    try {
      const data = virtualDiagramService.create({ name: args.name, type: 'virtual', tables: args.tables });
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_UPDATE, async (_event, args: { id: string; name?: string; tables?: ITable[] }) => {
    try {
      const { id, ...data } = args;
      const result = virtualDiagramService.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_DELETE, async (_event, args: { id: string }) => {
    try {
      virtualDiagramService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ─── Layout ───
  ipcMain.handle(CHANNELS.DIAGRAM_GET_LAYOUT, async (_event, args: { diagramId: string }) => {
    try {
      const data = virtualDiagramService.getLayout(args.diagramId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_SAVE_LAYOUT, async (_event, args: IDiagramLayout) => {
    try {
      virtualDiagramService.saveLayout(args);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ─── Diagram Versions ───
  ipcMain.handle(CHANNELS.DIAGRAM_VERSION_LIST, async (_event, args: { diagramId: string }) => {
    try {
      const data = virtualDiagramService.listVersions(args.diagramId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_VERSION_CREATE, async (_event, args: { diagramId: string; ddlContent: string }) => {
    try {
      const data = virtualDiagramService.createVersion(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DIAGRAM_VERSION_RESTORE, async (_event, args: { versionId: string }) => {
    try {
      const data = virtualDiagramService.restoreVersion(args.versionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  // ─── Schema (Real) ───
  ipcMain.handle(CHANNELS.SCHEMA_FETCH_REAL, async (_event, args: { connectionId: string }) => {
    try {
      const data = await schemaService.fetchRealSchema(args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  // ─── Diff ───
  ipcMain.handle(CHANNELS.SCHEMA_DIFF, async (_event, args: { virtualDiagramId: string; connectionId: string }) => {
    try {
      const data = await diffService.compareDiagrams(args.virtualDiagramId, args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  // ─── DDL Parse/Generate (placeholder - parsing DDL is complex) ───
  ipcMain.handle(CHANNELS.DDL_PARSE, async (_event, args: { ddl: string; dbType: TDbType }) => {
    try {
      // Basic DDL parsing - extracts CREATE TABLE statements
      const tables = parseDdl(args.ddl);
      return { success: true, data: tables };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DDL_GENERATE, async (_event, args: { tables: ITable[]; dbType: TDbType }) => {
    try {
      const ddl = generateDdl(args.tables, args.dbType);
      return { success: true, data: { ddl } };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}

function parseDdl(ddl: string): ITable[] {
  const tables: ITable[] = [];
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\)\s*;/gi;

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(ddl)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = parseColumns(body);

    tables.push({
      id: crypto.randomUUID(),
      name: tableName,
      comment: '',
      columns,
      constraints: [],
    });
  }

  return tables;
}

function parseColumns(body: string): import('~/shared/types/db').IColumn[] {
  const columns: import('~/shared/types/db').IColumn[] = [];
  // Split by comma, but careful with nested parentheses
  const lines = splitColumnDefs(body);
  let position = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip constraints lines (PRIMARY KEY, FOREIGN KEY, UNIQUE, INDEX, KEY, CONSTRAINT)
    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|KEY|CONSTRAINT|CHECK)\s/i.test(trimmed)) {
      continue;
    }

    const colMatch = trimmed.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\([^)]*\))?)/i);
    if (!colMatch) continue;

    position++;
    const colName = colMatch[1];
    const dataType = colMatch[2];
    const rest = trimmed.slice(colMatch[0].length).toLowerCase();

    columns.push({
      id: crypto.randomUUID(),
      name: colName,
      dataType,
      keyType: rest.includes('primary key') ? 'PK' : null,
      defaultValue: null,
      nullable: !rest.includes('not null'),
      comment: '',
      reference: null,
      constraints: [],
      ordinalPosition: position,
    });
  }

  return columns;
}

function splitColumnDefs(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of body) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current);
  return parts;
}

function generateDdl(tables: ITable[], dbType: TDbType): string {
  const lines: string[] = [];

  for (const table of tables) {
    const colDefs: string[] = [];

    for (const col of table.columns) {
      let def = `  ${quoteId(col.name, dbType)} ${col.dataType}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.keyType === 'PK') def += ' PRIMARY KEY';
      colDefs.push(def);
    }

    // Add FK constraints
    for (const col of table.columns) {
      if (col.reference) {
        let fk = `  FOREIGN KEY (${quoteId(col.name, dbType)}) REFERENCES ${quoteId(col.reference.table, dbType)}(${quoteId(col.reference.column, dbType)})`;
        if (col.reference.onDelete) fk += ` ON DELETE ${col.reference.onDelete}`;
        if (col.reference.onUpdate) fk += ` ON UPDATE ${col.reference.onUpdate}`;
        colDefs.push(fk);
      }
    }

    lines.push(`CREATE TABLE ${quoteId(table.name, dbType)} (`);
    lines.push(colDefs.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  return lines.join('\n');
}

function quoteId(name: string, dbType: TDbType): string {
  if (dbType === 'postgresql') return `"${name}"`;
  return `\`${name}\``;
}
