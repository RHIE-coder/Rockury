import type { LucideIcon } from 'lucide-react';

export type TDbArea = 'overview' | 'package' | 'studio' | 'console';

export interface IDbAreaItem {
  id: TDbArea;
  label: string;
  icon: LucideIcon;
  path: string;
}
