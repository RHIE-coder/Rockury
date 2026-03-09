import type { LucideIcon } from 'lucide-react';

export interface ISidebarService {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  enabled: boolean;
}
