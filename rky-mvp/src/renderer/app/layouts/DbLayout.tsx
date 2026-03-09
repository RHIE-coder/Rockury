import { Outlet } from 'react-router';
import { AreaToggle } from '@/widgets/db-area-toggle';

export function DbLayout() {
  return (
    <div className="flex flex-col h-full">
      <AreaToggle />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
