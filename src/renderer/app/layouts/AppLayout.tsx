import { Outlet } from 'react-router';
import { AppSidebar } from '@/widgets/app-sidebar';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
