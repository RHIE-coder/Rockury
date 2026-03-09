import { Providers, AppRouter } from '@/app';

export default function App() {
  return (
    <Providers>
      <div className="min-h-screen bg-background text-foreground">
        <AppRouter />
      </div>
    </Providers>
  );
}
