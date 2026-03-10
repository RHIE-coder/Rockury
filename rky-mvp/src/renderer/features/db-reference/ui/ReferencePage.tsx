import { useState, useMemo } from 'react';
import { ReferenceSidebar } from './ReferenceSidebar';
import { ReferenceDetail } from './ReferenceDetail';
import type { IReferenceCategory, IReferenceItem } from '../model/types';

import tableColumnData from '../data/table-column.json';
import constraintsData from '../data/constraints.json';
import indexesData from '../data/indexes.json';
import viewsData from '../data/views.json';
import routinesData from '../data/routines.json';
import triggersEventsData from '../data/triggers-events.json';
import typesSequencesData from '../data/types-sequences.json';
import partitioningData from '../data/partitioning.json';
import securityData from '../data/security.json';
import advancedData from '../data/advanced.json';

const categories: IReferenceCategory[] = [
  { id: 'table-column', label: '1. Table & Column', items: tableColumnData as IReferenceItem[] },
  { id: 'constraints', label: '2. Constraints', items: constraintsData as IReferenceItem[] },
  { id: 'indexes', label: '3. Indexes', items: indexesData as IReferenceItem[] },
  { id: 'views', label: '4. Views', items: viewsData as IReferenceItem[] },
  { id: 'routines', label: '5. Routines', items: routinesData as IReferenceItem[] },
  { id: 'triggers-events', label: '6. Triggers & Events', items: triggersEventsData as IReferenceItem[] },
  { id: 'types-sequences', label: '7. Types & Sequences', items: typesSequencesData as IReferenceItem[] },
  { id: 'partitioning', label: '8. Partitioning', items: partitioningData as IReferenceItem[] },
  { id: 'security', label: '9. Security', items: securityData as IReferenceItem[] },
  { id: 'advanced', label: '10. Advanced', items: advancedData as IReferenceItem[] },
];

export function ReferencePage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const allItems = useMemo(() => categories.flatMap((c) => c.items), []);
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null;

  return (
    <div className="flex h-full">
      <ReferenceSidebar
        categories={categories}
        selectedItemId={selectedItemId}
        onSelect={setSelectedItemId}
      />
      {selectedItem ? (
        <ReferenceDetail item={selectedItem} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select an item to view details
        </div>
      )}
    </div>
  );
}
