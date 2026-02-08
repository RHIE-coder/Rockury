import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/shared/config/constants';
import { Button } from '@/shared/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <FileQuestion className="size-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Page Not Found</h1>
      <p className="text-sm text-muted-foreground">요청하신 페이지를 찾을 수 없습니다.</p>
      <Button asChild variant="outline">
        <Link to={ROUTES.DB.PACKAGE}>홈으로 이동</Link>
      </Button>
    </div>
  );
}
