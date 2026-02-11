import { diagramRepository } from '#/repositories';
import { diagramVersionRepository } from '#/repositories';
import type { IDiagram, IDiagramLayout, IDiagramVersion, ITable } from '~/shared/types/db';

export const virtualDiagramService = {
  list(includeHidden = false): IDiagram[] {
    const diagrams = diagramRepository.list('virtual');
    if (includeHidden) return diagrams;
    return diagrams.filter(d => !d.hidden);
  },

  getById(id: string): IDiagram {
    const diagram = diagramRepository.getById(id);
    if (!diagram) throw new Error(`Diagram not found: ${id}`);
    return diagram;
  },

  create(data: { name: string; type: 'virtual'; version?: string; description?: string; tables?: ITable[] }): IDiagram {
    return diagramRepository.create(data);
  },

  update(id: string, data: { name?: string; version?: string; tables?: ITable[]; description?: string }): IDiagram {
    const existing = diagramRepository.getById(id);
    if (!existing) throw new Error(`Diagram not found: ${id}`);
    return diagramRepository.update(id, data);
  },

  deleteById(id: string): void {
    diagramRepository.deleteById(id);
  },

  getLayout(diagramId: string): IDiagramLayout | null {
    return diagramRepository.getLayout(diagramId);
  },

  saveLayout(layout: IDiagramLayout): void {
    diagramRepository.saveLayout(layout);
  },

  createVersion(data: {
    diagramId: string;
    name: string;
    ddlContent: string;
    schemaSnapshot?: unknown;
  }): IDiagramVersion {
    const snapshot = data.schemaSnapshot ?? diagramRepository.getById(data.diagramId);
    if (!snapshot) throw new Error(`Diagram not found: ${data.diagramId}`);
    return diagramVersionRepository.create({
      diagramId: data.diagramId,
      name: data.name,
      ddlContent: data.ddlContent,
      schemaSnapshot: snapshot,
    });
  },

  updateVersion(id: string, data: { name?: string; ddlContent?: string; schemaSnapshot?: unknown }): IDiagramVersion {
    return diagramVersionRepository.update(id, data);
  },

  deleteVersion(id: string): void {
    diagramVersionRepository.deleteById(id);
  },

  listVersions(diagramId: string): IDiagramVersion[] {
    return diagramVersionRepository.list(diagramId);
  },

  reorderVersions(diagramId: string, orderedVersionIds: string[]): void {
    diagramVersionRepository.reorder(diagramId, orderedVersionIds);
  },

  clone(id: string, newName?: string): IDiagram {
    const source = diagramRepository.getById(id);
    if (!source) throw new Error(`Diagram not found: ${id}`);

    const clonedName = newName ?? `${source.name} (copy)`;
    const cloned = diagramRepository.create({
      name: clonedName,
      type: 'virtual',
      version: source.version,
      tables: source.tables,
    });

    // Copy layout if exists
    const sourceLayout = diagramRepository.getLayout(id);
    if (sourceLayout) {
      diagramRepository.saveLayout({
        diagramId: cloned.id,
        positions: sourceLayout.positions,
        zoom: sourceLayout.zoom,
        viewport: sourceLayout.viewport,
        hiddenTableIds: sourceLayout.hiddenTableIds,
        tableColors: sourceLayout.tableColors,
      });
    }

    return cloned;
  },

  restoreVersion(versionId: string): IDiagram {
    const version = diagramVersionRepository.getById(versionId);
    if (!version) throw new Error(`Diagram version not found: ${versionId}`);

    const snapshot = version.schemaSnapshot;
    return diagramRepository.update(version.diagramId, {
      name: snapshot.name,
      tables: snapshot.tables,
    });
  },
};
