# Project Architecture

## Design Pattern: Feature-Sliced Design (FSD)

> Reference: https://feature-sliced.design

FSD는 프론트엔드 프로젝트를 위한 아키텍처 방법론으로, **높은 응집도**와 **낮은 결합도**를 보장합니다.

---

## Core Concepts

### 1. Layers (레이어)
코드를 책임에 따라 수직으로 분리합니다.

### 2. Slices (슬라이스)
각 레이어 내부를 비즈니스 도메인별로 분리합니다.

### 3. Segments (세그먼트)
각 슬라이스 내부를 기술적 역할에 따라 분리합니다.

---

## Directory Structure

```
src/
├── app/                              # [Electron] Main process entry
│   ├── main.ts
│   ├── preload.ts
│   ├── windows.ts
│   └── windows-config.ts
│
├── main/                             # [Electron] Main process logic
│   ├── ipc/                          # IPC handlers by domain
│   │   └── [slice]Handlers.ts
│   └── services/                     # Business services
│       └── [slice]Service.ts
│
├── renderer/                         # [React] Renderer process
│   │
│   ├── app/                          # Layer 1: App ─────────────────
│   │   ├── main-window/              # Window entry point
│   │   │   ├── App.tsx               # Root component
│   │   │   ├── index.tsx             # React mount
│   │   │   └── index.html
│   │   ├── providers/                # Global providers
│   │   │   └── index.tsx             # QueryClient, Theme, etc.
│   │   ├── routes/                   # Route definitions
│   │   │   └── index.tsx
│   │   ├── styles/                   # Global styles
│   │   │   └── index.css
│   │   └── index.ts
│   │
│   ├── pages/                        # Layer 2: Pages ───────────────
│   │   └── [page-name]/
│   │       ├── ui/                   # Page UI components
│   │       │   └── [PageName]Page.tsx
│   │       ├── model/                # Page-specific logic (optional)
│   │       └── index.ts              # Public API
│   │
│   ├── widgets/                      # Layer 3: Widgets ─────────────
│   │   └── [widget-name]/
│   │       ├── ui/
│   │       ├── model/
│   │       └── index.ts
│   │
│   ├── features/                     # Layer 4: Features ────────────
│   │   └── [feature-name]/
│   │       ├── ui/                   # Feature UI components
│   │       ├── model/                # State, types, business logic
│   │       ├── api/                  # API calls (IPC, HTTP)
│   │       ├── lib/                  # Feature utilities
│   │       └── index.ts              # Public API
│   │
│   ├── entities/                     # Layer 5: Entities ────────────
│   │   └── [entity-name]/
│   │       ├── ui/                   # Entity UI (cards, rows, etc.)
│   │       ├── model/                # Entity types & logic
│   │       ├── api/                  # Entity CRUD
│   │       └── index.ts              # Public API
│   │
│   └── shared/                       # Layer 6: Shared ──────────────
│       ├── ui/                       # UI kit (Button, Input, etc.)
│       ├── api/                      # API clients, IPC wrappers
│       ├── lib/                      # Utilities (cn, formatDate)
│       ├── config/                   # Constants, env
│       └── types/                    # Global types
│
├── shared/                           # [Cross-Process] Main-Renderer shared
│   ├── ipc/
│   │   ├── channels.ts               # IPC channel definitions
│   │   ├── events.ts                 # IPC event types
│   │   └── preload.ts                # Preload API types
│   └── types/
│       └── index.ts                  # Shared type definitions
│
└── vite-env.d.ts

tests/
├── e2e/                              # End-to-end tests
│   └── [feature].e2e.ts
├── integration/                      # Integration tests
│   └── [feature].int.ts
└── setup.ts                          # Test setup
```

---

## Layer Hierarchy & Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│  app         → 앱 초기화, providers, routes                  │
├─────────────────────────────────────────────────────────────┤
│  pages       → 라우트 페이지, widgets/features 조합           │
├─────────────────────────────────────────────────────────────┤
│  widgets     → 독립적인 UI 블록 (Sidebar, Header)            │
├─────────────────────────────────────────────────────────────┤
│  features    → 비즈니스 기능 (auth, search, settings)        │
├─────────────────────────────────────────────────────────────┤
│  entities    → 비즈니스 엔티티 (user, project, file)         │
├─────────────────────────────────────────────────────────────┤
│  shared      → 재사용 가능한 인프라 (ui, lib, api)            │
└─────────────────────────────────────────────────────────────┘
         ↑
    Import 방향 (위에서 아래로만 가능)
```

### Import Rules

```typescript
// ✅ 허용: 상위 → 하위
import { Button } from '@/shared/ui';           // pages → shared
import { UserCard } from '@/entities/user';     // features → entities
import { useAuth } from '@/features/auth';      // pages → features

// ❌ 금지: 하위 → 상위
import { HomePage } from '@/pages/home';        // features → pages ❌
import { Sidebar } from '@/widgets/sidebar';    // entities → widgets ❌

// ❌ 금지: 같은 레이어 간 크로스 임포트
import { useSearch } from '@/features/search';  // features/auth → features/search ❌
```

---

## Segments (세그먼트)

각 슬라이스 내부 폴더 구조:

| Segment | 역할 | 예시 |
|---------|------|------|
| `ui/` | UI 컴포넌트, 스타일 | `LoginForm.tsx`, `styles.css` |
| `model/` | 상태, 타입, 비즈니스 로직 | `authStore.ts`, `types.ts` |
| `api/` | 외부 통신 (IPC, HTTP) | `authApi.ts` |
| `lib/` | 슬라이스 전용 유틸리티 | `validation.ts` |
| `config/` | 설정, 상수 | `constants.ts` |

### Segment Example

```
features/auth/
├── ui/
│   ├── LoginForm.tsx
│   ├── LoginForm.test.tsx
│   └── index.ts
├── model/
│   ├── authStore.ts          # Zustand store
│   ├── types.ts              # AuthState, User types
│   └── index.ts
├── api/
│   ├── authApi.ts            # IPC calls to main process
│   └── index.ts
├── lib/
│   ├── validation.ts         # Form validation
│   └── index.ts
└── index.ts                  # Public API
```

---

## Public API Pattern

각 슬라이스는 `index.ts`를 통해 **명시적인 Public API**만 노출합니다.

```typescript
// features/auth/index.ts

// UI
export { LoginForm } from './ui';
export { LogoutButton } from './ui';

// Model
export { useAuthStore } from './model';
export type { User, AuthState } from './model';

// Hooks (derived from model)
export { useAuth, useCurrentUser } from './model';
```

### Benefits
- 내부 구현 은닉
- 리팩토링 시 영향 범위 제한
- 명확한 의존성 파악

---

## Layer Examples

### App Layer
```typescript
// renderer/app/main-window/App.tsx
import { Providers } from '../providers';
import { AppRouter } from '../routes';

export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
```

### Pages Layer
```typescript
// renderer/pages/home/ui/HomePage.tsx
import { Sidebar } from '@/widgets/sidebar';
import { ProjectList } from '@/features/project';
import { UserProfile } from '@/entities/user';

export function HomePage() {
  return (
    <div className="flex">
      <Sidebar />
      <main>
        <UserProfile />
        <ProjectList />
      </main>
    </div>
  );
}
```

### Widgets Layer
```typescript
// renderer/widgets/sidebar/ui/Sidebar.tsx
import { Navigation } from '@/features/navigation';
import { UserMenu } from '@/entities/user';
import { Logo } from '@/shared/ui';

export function Sidebar() {
  return (
    <aside>
      <Logo />
      <Navigation />
      <UserMenu />
    </aside>
  );
}
```

### Features Layer
```typescript
// renderer/features/auth/ui/LoginForm.tsx
import { useAuthStore } from '../model';
import { authApi } from '../api';
import { Button, Input } from '@/shared/ui';

export function LoginForm() {
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (data: LoginData) => {
    await authApi.login(data);
    login(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="email" />
      <Input name="password" type="password" />
      <Button loading={isLoading}>Login</Button>
    </form>
  );
}
```

### Entities Layer
```typescript
// renderer/entities/user/ui/UserCard.tsx
import { User } from '../model';
import { Avatar, Card } from '@/shared/ui';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <Card>
      <Avatar src={user.avatar} />
      <span>{user.name}</span>
    </Card>
  );
}
```

### Shared Layer
```typescript
// renderer/shared/ui/button/Button.tsx
import { cn } from '@/shared/lib';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`)}>
      {children}
    </button>
  );
}
```

---

## Main Process: Layered Architecture

Main process는 **Layered Architecture**를 적용하여 관심사를 분리합니다.

### Layer Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (IPC Handlers)                         │
│  → IPC 요청 수신, 응답 반환                                   │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (Services)                              │
│  → 비즈니스 로직 조율, 트랜잭션 관리                           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (Repositories)                                 │
│  → 데이터 접근 추상화 (CRUD)                                  │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                      │
│  → 외부 시스템 연결 (DB, File, API)                          │
└─────────────────────────────────────────────────────────────┘
              ↓ (위에서 아래로만 의존)
```

### Main Process Structure

```
main/
├── ipc/                            # Presentation Layer
│   ├── handlers/                   # IPC request handlers
│   │   ├── authHandlers.ts         # 인증 관련 IPC
│   │   ├── fileHandlers.ts         # 파일 관련 IPC
│   │   └── index.ts                # Handler 등록
│   └── index.ts                    # 전체 IPC 초기화
│
├── services/                       # Application Layer
│   ├── authService.ts              # 인증 비즈니스 로직
│   ├── fileService.ts              # 파일 비즈니스 로직
│   └── index.ts
│
├── repositories/                   # Data Layer
│   ├── userRepository.ts           # 사용자 데이터 접근
│   ├── fileRepository.ts           # 파일 데이터 접근
│   └── index.ts
│
└── infrastructure/                 # Infrastructure Layer
    ├── database.ts                 # DB 연결 (SQLite, etc.)
    ├── filesystem.ts               # 파일시스템 래퍼
    └── index.ts
```

### Layer Rules

| Layer | 역할 | 의존 가능 |
|-------|------|----------|
| `ipc/handlers/` | IPC 요청 처리 | services |
| `services/` | 비즈니스 로직 | repositories, infrastructure |
| `repositories/` | 데이터 CRUD | infrastructure |
| `infrastructure/` | 외부 시스템 | 없음 (최하위) |

### Code Example

```typescript
// main/ipc/handlers/authHandlers.ts (Presentation)
import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { authService } from '#/services/authService';

export function registerAuthHandlers() {
  ipcMain.handle(CHANNELS.AUTH_LOGIN, async (_, data) => {
    return authService.login(data);
  });

  ipcMain.handle(CHANNELS.AUTH_LOGOUT, async (_, userId) => {
    return authService.logout(userId);
  });
}

// main/services/authService.ts (Application)
import { userRepository } from '#/repositories/userRepository';
import { hashPassword, verifyPassword } from '#/infrastructure/crypto';

export const authService = {
  async login(data: LoginData) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) throw new Error('User not found');

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) throw new Error('Invalid password');

    return { user: { id: user.id, email: user.email, name: user.name } };
  },

  async logout(userId: string) {
    // 로그아웃 로직
  }
};

// main/repositories/userRepository.ts (Data)
import { db } from '#/infrastructure/database';
import type { User } from '~/shared/types';

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return db.users.findFirst({ where: { email } });
  },

  async findById(id: string): Promise<User | null> {
    return db.users.findFirst({ where: { id } });
  },

  async create(data: CreateUserData): Promise<User> {
    return db.users.create({ data });
  }
};

// main/infrastructure/database.ts (Infrastructure)
import Database from 'better-sqlite3';

const sqlite = new Database('app.db');

export const db = {
  users: {
    findFirst: (opts: { where: Record<string, unknown> }) => {
      // SQLite 쿼리 구현
    },
    create: (opts: { data: Record<string, unknown> }) => {
      // SQLite 쿼리 구현
    }
  }
};
```

---

### IPC Communication Pattern
```typescript
// shared/ipc/channels.ts
export const CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
} as const;

// renderer/features/auth/api/authApi.ts
import { CHANNELS } from '~/shared/ipc/channels';

export const authApi = {
  login: (data: LoginData) =>
    window.electronAPI[CHANNELS.AUTH_LOGIN](data),
  logout: () =>
    window.electronAPI[CHANNELS.AUTH_LOGOUT](),
};

// main/ipc/authHandlers.ts
import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { authService } from '#/services/authService';

export function registerAuthHandlers() {
  ipcMain.handle(CHANNELS.AUTH_LOGIN, async (_, data) => {
    return authService.login(data);
  });
}
```

---

## Test Strategy

| Type | Location | Naming | Purpose |
|------|----------|--------|---------|
| Unit | Colocated | `*.test.ts` | 개별 함수/컴포넌트 |
| Integration | `tests/integration/` | `*.int.ts` | 슬라이스 간 상호작용 |
| E2E | `tests/e2e/` | `*.e2e.ts` | 사용자 시나리오 |

### Coverage Targets
| Layer | Target |
|-------|--------|
| entities/model | 90%+ |
| features/model | 90%+ |
| features/api | 85%+ |
| shared/lib | 90%+ |
| ui components | 70%+ |

---

## Path Aliases

| Alias | Path | Layer |
|-------|------|-------|
| `@/*` | `src/renderer/*` | Renderer layers |
| `#/*` | `src/main/*` | Main process |
| `~/*` | `src/*` | All source |

---

## Migration Checklist

### Renderer (FSD)
- [ ] `renderer/app/` - providers, routes 분리
- [ ] `renderer/pages/` - 페이지별 슬라이스 생성
- [ ] `renderer/widgets/` - 독립 UI 블록 분리
- [ ] `renderer/features/` - 비즈니스 기능 분리
- [ ] `renderer/entities/` - 엔티티 분리
- [ ] `renderer/shared/` - 공통 코드 정리
- [ ] Public API (index.ts) 정의
- [ ] Import 규칙 검증

### Main (Layered)
- [ ] `main/ipc/handlers/` - 도메인별 핸들러 분리
- [ ] `main/services/` - 비즈니스 로직 분리
- [ ] `main/repositories/` - 데이터 접근 계층 구현
- [ ] `main/infrastructure/` - 외부 시스템 연결 구현
- [ ] 레이어 간 의존성 규칙 검증
