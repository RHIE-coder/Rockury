import { diagramRepository } from '#/repositories';
import { diagramVersionRepository } from '#/repositories';
import type { IDiagram, IDiagramLayout, IDiagramVersion, ITable } from '~/shared/types/db';

export const virtualDiagramService = {
  list(): IDiagram[] {
    return diagramRepository.list('virtual');
  },

  getById(id: string): IDiagram {
    const diagram = diagramRepository.getById(id);
    if (!diagram) throw new Error(`Diagram not found: ${id}`);
    return diagram;
  },

  create(data: { name: string; type: 'virtual'; tables?: ITable[] }): IDiagram {
    return diagramRepository.create(data);
  },

  update(id: string, data: { name?: string; tables?: ITable[] }): IDiagram {
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
    ddlContent: string;
  }): IDiagramVersion {
    const diagram = diagramRepository.getById(data.diagramId);
    if (!diagram) throw new Error(`Diagram not found: ${data.diagramId}`);
    return diagramVersionRepository.create({
      diagramId: data.diagramId,
      ddlContent: data.ddlContent,
      schemaSnapshot: diagram,
    });
  },

  listVersions(diagramId: string): IDiagramVersion[] {
    return diagramVersionRepository.list(diagramId);
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
