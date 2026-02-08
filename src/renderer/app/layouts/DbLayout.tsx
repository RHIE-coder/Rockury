import { Outlet } from 'react-router';
import { DbTopNav } from '@/widgets/db-top-nav';

export function DbLayout() {
  return (
    <div className="flex flex-col h-full">
      <DbTopNav />
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
