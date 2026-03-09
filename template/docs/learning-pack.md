# Learning Pack

## Tech Stack Overview

| 기술 | 버전 | 용도 | 학습 우선순위 |
|------|------|------|--------------|
| Electron | 40 | 데스크톱 앱 프레임워크 | 필수 |
| React | 19 | UI 라이브러리 | 필수 |
| TypeScript | 5.9 | 타입 시스템 | 필수 |
| Vite | 7 | 빌드 도구 (Electron Forge 플러그인) | 권장 |
| Tailwind CSS | 4 | 유틸리티 CSS 프레임워크 | 권장 |
| TanStack React Query | 5 | 서버 상태 관리 (IPC 호출 래핑) | 권장 |
| Zustand | 5 | 클라이언트 상태 관리 | 선택 |
| CVA + tailwind-merge | 0.7 / 3.4 | 컴포넌트 변형(variant) 관리 | 권장 |
| React Router | 7 | 클라이언트 사이드 라우팅 | 권장 |
| Vitest | 4 | 테스트 프레임워크 | 권장 |
| Radix UI | 1.4 | 접근성 기반 UI 프리미티브 | 선택 |
| Lucide React | 0.563 | 아이콘 라이브러리 | 선택 |

---

## Learning Path

### Week 1: Foundation
- [ ] TypeScript 기본 문법 (type, interface, generic, as const, mapped types)
- [ ] React 기본 (컴포넌트, Props, State, Hooks)
- [ ] 프로젝트 구조 이해
  - [ ] FSD 레이어 구조: `src/renderer/` 내 app -> pages -> features -> entities -> shared
  - [ ] Layered 구조: `src/main/` 내 ipc/handlers -> services -> repositories -> infrastructure
  - [ ] Shared 영역: `src/shared/` 내 ipc/, types/
- [ ] Path alias 이해: `~/`, `@/`, `#/`
- [ ] 개발 환경 설정 및 `npm start`로 앱 실행

### Week 2: Architecture Deep Dive
- [ ] Electron IPC 이해 (Main Process vs Renderer Process, contextBridge)
- [ ] Type-Safe IPC 체인 분석
  - [ ] `src/shared/ipc/channels.ts` -- 채널 상수
  - [ ] `src/shared/ipc/events.ts` -- args/response 타입 매핑
  - [ ] `src/shared/ipc/preload.ts` -- TElectronAPI 자동 파생 (mapped types)
  - [ ] `src/app/preload.ts` -- contextBridge 실제 구현
- [ ] TanStack Query 패턴
  - [ ] `useQuery`로 IPC 호출 래핑 (캐싱, staleTime)
  - [ ] `useMutation` + `invalidateQueries` 패턴 (CRUD 후 캐시 무효화)
- [ ] Repository 패턴 (fileSystem.readJsonFile -> CRUD -> fileSystem.writeJsonFile)

### Week 3: Hands-On Practice
- [ ] 새 기능 추가 실습 (예: 프롬프트 검색, 즐겨찾기)
- [ ] 새 IPC 채널 추가 (channels -> events -> preload -> handler -> service)
- [ ] 테스트 코드 작성 (Vitest, Testing Library)
- [ ] CVA 컴포넌트 패턴으로 새 UI 컴포넌트 생성
- [ ] PR 리뷰 참여

---

## Key Concepts

### 1. Feature-Sliced Design (FSD)

**What**: UI 아키텍처 방법론으로 코드를 레이어(app -> pages -> widgets -> features -> entities -> shared)로 분리한다. 각 레이어는 명확한 책임을 가지며, import는 위에서 아래 방향으로만 허용된다.

**Why**: AI가 생성한 코드의 위치를 예측 가능하게 만들어 감독(supervision)이 용이하다. "페이지 관련 코드는 pages/, 비즈니스 기능은 features/, 도메인 모델은 entities/"처럼 규칙이 명확하므로 코드 리뷰와 유지보수가 쉬워진다.

**How**:
```
src/renderer/
  app/              # 앱 초기화, Providers, Routes
    providers/      # QueryClientProvider, BrowserRouter
    routes/         # AppRouter (/, /prompts)
    styles/         # Tailwind CSS 진입점
  pages/
    home/           # HomePage -- 대시보드, 시스템 정보
    prompts/        # PromptsPage -- 프롬프트 CRUD UI
  features/
    prompt-crud/    # usePrompts, useCreatePrompt, PromptForm, DeletePromptButton
    prompt-copy/    # CopyPromptButton
  entities/
    prompt/         # promptApi, IPrompt 타입, PromptCard UI
  shared/
    components/ui/  # Button, Card, Badge, Input, Textarea, Select
    api/            # getElectronApi()
    hooks/          # use-mobile, use-theme
    lib/            # cn() 유틸
```

**핵심 포인트**:
- `pages/prompts/`는 `features/prompt-crud/`와 `entities/prompt/`를 import한다
- `features/prompt-crud/`는 `entities/prompt/`의 `promptApi`를 import한다
- `entities/prompt/`는 `shared/api/`의 `getElectronApi()`를 import한다
- 같은 레이어 간 import는 금지된다 (예: feature A -> feature B 불가)

---

### 2. Type-Safe IPC

**What**: Main과 Renderer 프로세스 간 IPC 통신을 타입 수준에서 보장하는 3단계 체인이다.

**Why**: 채널명 오타, 잘못된 인자/응답 타입을 컴파일 타임에 방지한다. 새 IPC 채널을 추가할 때 누락된 타입 정의가 있으면 TypeScript가 즉시 에러를 보여준다.

**How**:
```typescript
// 1단계: src/shared/ipc/channels.ts -- 채널 상수 정의
export const CHANNELS = {
  GET_PROMPTS: 'GET_PROMPTS',
  CREATE_PROMPT: 'CREATE_PROMPT',
  UPDATE_PROMPT: 'UPDATE_PROMPT',
  DELETE_PROMPT: 'DELETE_PROMPT',
} as const;

// 2단계: src/shared/ipc/events.ts -- 채널별 args/response 타입 매핑
export interface IEvents {
  [CHANNELS.GET_PROMPTS]: {
    args: void;
    response: { success: boolean; data: IPrompt[] };
  };
  [CHANNELS.CREATE_PROMPT]: {
    args: ICreatePromptRequest;
    response: { success: boolean; data: IPrompt };
  };
  // ...
}

// 3단계: src/shared/ipc/preload.ts -- Renderer용 API 타입 자동 파생
type TOptionalArgs<T> = T extends void ? [] : [args: T];

export type TElectronAPI = {
  [K in keyof typeof CHANNELS]: (
    ...args: TOptionalArgs<IEvents[typeof CHANNELS[K]]["args"]>
  ) => Promise<IEvents[typeof CHANNELS[K]]["response"]>;
};
```

**핵심 포인트**:
- `CHANNELS`에 채널을 추가하면 `IEvents`에서 타입 정의를 강제받는다
- `TElectronAPI`는 mapped types로 자동 파생되므로 수동 관리가 불필요하다
- `TOptionalArgs`로 `void` 인자인 경우 파라미터 생략이 가능하다

---

### 3. CVA Component Pattern

**What**: class-variance-authority(CVA)로 컴포넌트 변형(variant)을 선언적으로 관리하는 패턴이다. `cn()` 유틸(clsx + tailwind-merge)과 함께 사용하여 Tailwind CSS 클래스 충돌을 방지한다.

**Why**: 일관된 디자인 시스템을 유지하면서도 컴포넌트별로 유연한 변형을 정의할 수 있다. shadcn/ui 패턴을 따르므로 커뮤니티 생태계와 호환된다.

**How**:
```typescript
// src/renderer/shared/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 ...", // 기본 클래스
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 ...",
        outline: "border bg-background shadow-xs hover:bg-accent ...",
        secondary: "bg-secondary text-secondary-foreground ...",
        ghost: "hover:bg-accent hover:text-accent-foreground ...",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs ...",
        sm: "h-8 rounded-md gap-1.5 px-3 ...",
        lg: "h-10 rounded-md px-6 ...",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

```typescript
// src/renderer/shared/lib/utils.ts -- cn() 유틸
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**핵심 포인트**:
- `cva()`로 기본 클래스 + variants를 선언적으로 정의한다
- `cn()`은 clsx(조건부 클래스)와 tailwind-merge(충돌 해결)를 합친 유틸이다
- `data-slot`, `data-variant`, `data-size` 속성으로 디버깅과 CSS 셀렉터 활용이 가능하다
- `asChild` 패턴으로 Radix UI Slot을 통한 컴포넌트 합성을 지원한다

---

### 4. TanStack Query + Electron IPC

**What**: 서버 상태 관리 라이브러리(TanStack React Query)를 Electron IPC 호출에 적용하는 패턴이다.

**Why**: 캐싱(`staleTime: 5분`), 자동 리페칭, 뮤테이션 후 캐시 무효화(`invalidateQueries`) 패턴을 IPC에서도 활용할 수 있다. 추후 네트워크 API로 전환 시 Query 레이어만 교체하면 된다.

**How**:
```typescript
// src/renderer/features/prompt-crud/api/usePromptQueries.ts

// 조회: useQuery로 IPC 래핑
export function usePrompts() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const result = await promptApi.getAll();
      if (!result.success) throw new Error('Failed to fetch prompts');
      return result.data;
    },
  });
}

// 생성: useMutation + invalidateQueries
export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ICreatePromptRequest) => {
      const result = await promptApi.create(data);
      if (!result.success) throw new Error('Failed to create prompt');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}
```

```typescript
// src/renderer/entities/prompt/api/promptApi.ts -- IPC 호출 래퍼
export const promptApi = {
  getAll: () => getElectronApi().GET_PROMPTS(),
  create: (data) => getElectronApi().CREATE_PROMPT(data),
  update: (data) => getElectronApi().UPDATE_PROMPT(data),
  delete: (id) => getElectronApi().DELETE_PROMPT({ id }),
};
```

**핵심 포인트**:
- `queryKey: ['prompts']`로 프롬프트 데이터의 캐시 키를 정의한다
- `useMutation`의 `onSuccess`에서 `invalidateQueries`를 호출하여 CRUD 후 목록을 자동 갱신한다
- `promptApi`는 `getElectronApi().CHANNEL_NAME()`으로 IPC를 호출하는 얇은 래퍼이다
- Provider 설정: `src/renderer/app/providers/index.tsx`에서 `QueryClientProvider`로 감싸고, `staleTime: 5분`, `retry: 1`로 설정한다

---

## Common Patterns

### Pattern 1: Repository Pattern

**사용 상황**: Main 프로세스에서 데이터 접근 로직을 infrastructure(파일시스템)와 분리할 때

**구현**:
```typescript
// src/main/repositories/promptRepository.ts
import { fileSystem } from '#/infrastructure';

const DATA_FILE = 'prompts.json';

export const promptRepository = {
  findAll(): IPrompt[] {
    return fileSystem.readJsonFile<IPrompt[]>(getFilePath(), []);
  },

  create(prompt: IPrompt): IPrompt {
    const prompts = this.findAll();
    prompts.push(prompt);
    fileSystem.writeJsonFile(getFilePath(), prompts);
    return prompt;
  },

  update(id: string, data: Partial<IPrompt>): IPrompt | undefined {
    const prompts = this.findAll();
    const index = prompts.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    prompts[index] = { ...prompts[index], ...data, updatedAt: new Date().toISOString() };
    fileSystem.writeJsonFile(getFilePath(), prompts);
    return prompts[index];
  },

  delete(id: string): boolean {
    const prompts = this.findAll();
    const filtered = prompts.filter((p) => p.id !== id);
    if (filtered.length === prompts.length) return false;
    fileSystem.writeJsonFile(getFilePath(), filtered);
    return true;
  },
};
```

**프로젝트 적용**:
- 파일: `src/main/repositories/promptRepository.ts`
- infrastructure 교체 시 (예: JSON -> SQLite) repository 구현만 변경하면 service 레이어는 영향 없음

---

### Pattern 2: IPC Handler Pattern

**사용 상황**: Renderer에서 오는 IPC 요청을 처리하고 일관된 응답 포맷을 반환할 때

**구현**:
```typescript
// src/main/ipc/handlers/promptHandlers.ts
import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { promptService } from '#/services';

export function registerPromptHandlers() {
  ipcMain.handle(CHANNELS.GET_PROMPTS, async () => {
    try {
      const data = promptService.getAll();
      return { success: true, data };
    } catch {
      return { success: false, data: [] };
    }
  });

  ipcMain.handle(CHANNELS.CREATE_PROMPT, async (_, args) => {
    try {
      const data = promptService.create(args);
      return { success: true, data };
    } catch {
      return { success: false, data: null };
    }
  });
}
```

**프로젝트 적용**:
- 파일: `src/main/ipc/handlers/promptHandlers.ts`, `src/main/ipc/handlers/systemInfoHandlers.ts`
- 모든 handler는 `try-catch`로 감싸서 `{ success: boolean, data?: T }` 포맷을 반환한다
- handler 등록은 `src/main/ipc/index.ts`에서 일괄 호출한다

---

## How-To Guides

### 환경 설정
```bash
# 의존성 설치
npm install

# 프로젝트 초기화 (에이전트 설정, 환경 구성)
npm run init

# 개발 서버 실행
npm start

# 배포용 패키지 빌드
npm run make

# 테스트 실행
npm test

# 커버리지 포함 테스트
npm run test:coverage
```

### 새 페이지 추가
1. 페이지 폴더 생성: `src/renderer/pages/[page-name]/ui/[PageName]Page.tsx`
2. 페이지 컴포넌트 작성
3. `src/renderer/pages/[page-name]/index.ts`에서 public API export
4. `src/renderer/app/routes/index.tsx`에 `<Route>` 추가
5. 필요한 features/entities 연결

### 새 IPC 채널 추가
1. `src/shared/ipc/channels.ts` -- `CHANNELS` 객체에 새 채널 추가
2. `src/shared/ipc/events.ts` -- `IEvents`에 args/response 타입 추가
3. `src/shared/ipc/preload.ts` -- `TElectronAPI`는 자동 파생 (수정 불필요)
4. `src/app/preload.ts` -- `API` 객체에 `ipcRenderer.invoke` 구현 추가
5. `src/main/ipc/handlers/` -- 새 handler 파일 생성 또는 기존 파일에 추가
6. `src/main/services/` -- 비즈니스 로직 구현
7. `src/main/ipc/index.ts` -- handler 등록 함수 호출 추가

### 새 UI 컴포넌트 생성
1. `src/renderer/shared/components/ui/[component].tsx` 파일 생성
2. CVA로 variants 정의:
   ```typescript
   const componentVariants = cva("기본 클래스", {
     variants: { variant: { ... }, size: { ... } },
     defaultVariants: { variant: "default", size: "default" },
   });
   ```
3. `cn()` 유틸로 클래스 합성
4. `data-slot="component-name"` 속성 추가
5. Props 타입에 `VariantProps<typeof componentVariants>` 교차 타입 적용

### 디버깅
- **Renderer 디버깅**: DevTools (Ctrl+Shift+I / Cmd+Option+I)
- **Main 디버깅**: VS Code 디버거 설정 또는 `console.log` (터미널 출력)

---

## Troubleshooting

### Tailwind CSS 클래스 미적용
**원인**: Tailwind CSS 4에서 Vite root가 서브디렉토리(`src/renderer/`)일 때, `src/` 전체의 클래스를 스캔하지 못한다.
**해결**: `src/renderer/app/styles/index.css`에 `@source` 지시자를 추가하여 소스 디렉토리를 확장한다.
```css
@import 'tailwindcss';
@source "../../../../src";
```

### Path alias 인식 안됨
**원인**: TypeScript와 Vite가 각각 별도의 모듈 해석 시스템을 사용하므로, 두 곳 모두에 alias를 설정해야 한다.
**해결**:
- `tsconfig.json`에 `paths` 설정:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "~/*": ["./src/*"],
        "@/*": ["./src/renderer/*"],
        "#/*": ["./src/main/*"]
      }
    }
  }
  ```
- `vite.common.config.ts`에 `resolve.alias` 설정

### IPC 채널 추가 후 타입 에러
**원인**: `CHANNELS`에 채널을 추가했지만 `IEvents`에 해당 타입 정의를 빠뜨렸다.
**해결**: `src/shared/ipc/events.ts`에서 새 채널의 `args`와 `response` 타입을 정의한다. `TElectronAPI`는 자동 파생되므로 별도 수정이 불필요하다.

---

## References

### 공식 문서
- [Electron](https://www.electronjs.org/docs) -- Main/Renderer 프로세스, IPC, contextBridge
- [React](https://react.dev) -- 컴포넌트, Hooks, 서버 컴포넌트(참조용)
- [TypeScript](https://www.typescriptlang.org/docs) -- 타입 시스템, mapped types, conditional types
- [Vite](https://vitejs.dev/guide) -- 빌드 도구, HMR, 플러그인
- [Feature-Sliced Design](https://feature-sliced.design) -- FSD 아키텍처 방법론
- [TanStack Query](https://tanstack.com/query/latest) -- useQuery, useMutation, QueryClient
- [Tailwind CSS 4](https://tailwindcss.com/docs) -- 유틸리티 CSS, @theme, @source
- [CVA (class-variance-authority)](https://cva.style/docs) -- 컴포넌트 변형 관리

### 내부 문서
- [Architecture](./architecture.md) -- 시스템 아키텍처, 모듈 구조, 데이터 흐름
- [Status Report](./status-report.md) -- 개발 현황, 리스크, 다음 단계

### 추천 자료
- [Electron Forge 문서](https://www.electronforge.io/) -- Electron 프로젝트 빌드/패키징 도구
- [shadcn/ui](https://ui.shadcn.com/) -- CVA + Tailwind 기반 컴포넌트 패턴의 원본
- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/) -- 클라이언트 상태 관리 (프로젝트에서 선택 사항)
