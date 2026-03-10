import type { TDbType } from '~/shared/types/db';

export interface IReferenceItem {
  id: string;
  category: string;
  name: string;
  summary: string;
  description: string;
  syntax: Partial<Record<TDbType, string | null>>;
  vendorSupport: Record<TDbType, {
    supported: boolean;
    level: 'full' | 'partial' | 'none';
    notes?: string;
  }>;
  tips?: string[];
  relatedItems?: string[];
  seeAlso?: string[];
}

export interface IReferenceCategory {
  id: string;
  label: string;
  items: IReferenceItem[];
}
