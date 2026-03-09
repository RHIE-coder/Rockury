import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  service: string;
}

export function PlaceholderPage({ service }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <Construction className="size-12" />
      <h1 className="text-xl font-semibold">{service}</h1>
      <p className="text-sm">Coming Soon</p>
    </div>
  );
}
