import { viewSnapshotRepository } from '#/repositories';
import type { IViewSnapshot, IDiagramFilter, IDiagramLayout } from '~/shared/types/db';

export const viewSnapshotService = {
  list(diagramId: string): IViewSnapshot[] {
    return viewSnapshotRepository.list(diagramId);
  },

  create(data: {
    diagramId: string;
    name: string;
    filter: IDiagramFilter;
    layout: IDiagramLayout;
  }): IViewSnapshot {
    return viewSnapshotRepository.create(data);
  },

  restore(snapshotId: string): IViewSnapshot {
    const snapshot = viewSnapshotRepository.getById(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);
    return snapshot;
  },

  delete(snapshotId: string): void {
    viewSnapshotRepository.deleteById(snapshotId);
  },
};
