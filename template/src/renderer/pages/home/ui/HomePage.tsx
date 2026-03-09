import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getElectronApi } from '@/shared/api';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Cpu, Layers, Zap, BookOpen, ArrowRight } from 'lucide-react';

function useSystemInfo() {
  return useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const result = await getElectronApi().GET_SYSTEM_INFO();
      if (!result.success) throw new Error('Failed to get system info');
      return result.data;
    },
    staleTime: Infinity,
  });
}

const features = [
  {
    icon: Layers,
    title: 'Feature-Sliced Design',
    description: 'Renderer 프로세스를 위한 FSD 아키텍처 (app → pages → widgets → features → entities → shared)',
  },
  {
    icon: Cpu,
    title: 'Layered Main Process',
    description: 'IPC handlers → services → repositories → infrastructure 레이어 분리',
  },
  {
    icon: Zap,
    title: 'Type-Safe IPC',
    description: 'CHANNELS + IEvents에서 자동 파생되는 타입-세이프 IPC 통신',
  },
  {
    icon: BookOpen,
    title: 'Prompt Manager',
    description: '이 아키텍처에 맞는 AI 프롬프트 템플릿으로 코드 생성',
  },
];

export function HomePage() {
  const { data: systemInfo, isLoading } = useSystemInfo();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Vibe Coding Framework
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          Electron + React Project Generator & Starter Template
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Badge variant="outline">Electron</Badge>
          <Badge variant="outline">React 19</Badge>
          <Badge variant="outline">TypeScript</Badge>
          <Badge variant="outline">Tailwind CSS 4</Badge>
          <Badge variant="outline">Vite</Badge>
        </div>
      </div>

      {/* System Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>IPC를 통해 Main 프로세스에서 가져온 런타임 정보</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : systemInfo ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoItem label="App Version" value={systemInfo.appVersion} />
              <InfoItem label="Electron" value={systemInfo.electronVersion} />
              <InfoItem label="Node.js" value={systemInfo.nodeVersion} />
              <InfoItem label="Chrome" value={systemInfo.chromeVersion} />
              <InfoItem label="Platform" value={systemInfo.platform} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-primary" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Quick Start */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5">npm start</code>
            {' '}— 개발 서버 실행
          </p>
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5">npm run make</code>
            {' '}— 배포용 패키지 빌드
          </p>
          <p>
            <strong>Prompt Manager</strong>를 사용하여 AI 기반 코드 스캐폴딩을 시작하세요.
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-center">
        <Button onClick={() => navigate('/prompts')}>
          Open Prompt Manager
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  );
}
