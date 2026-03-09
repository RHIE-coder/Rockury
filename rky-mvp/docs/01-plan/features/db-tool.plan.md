# Plan: DB Tool

## 1. Feature Overview

| Item | Detail |
|------|--------|
| Feature Name | DB Tool (Database Management Tool) |
| Priority | P0 - Core Feature |
| Project Level | Dynamic |
| Target Platform | Electron Desktop App |
| Estimated Complexity | Large (Multi-module feature) |

### Description
Rockury MVP의 핵심 DB 관리 도구. [API, Code, DB, Infra] 4대 영역 중 **DB 영역을 우선 구현**하며, 데이터베이스 스키마 설계, 연결 관리, 쿼리 실행, 문서화를 하나의 데스크톱 앱에서 통합 관리한다.

---

## 2. Problem Statement

### 현재 문제점
- DB 스키마 설계(ERD)와 실제 DB 간 불일치를 수동으로 확인해야 함
- 개발/스테이징/운영 환경별 DB 연결 정보 관리가 분산됨
- 스키마 변경 이력 관리가 어렵고, DDL 버전 관리가 별도 도구 필요
- DB 문서화가 별도 도구(Wiki, Notion 등)에 분산되어 코드와 동기화 안 됨
- Mock 데이터 생성과 스키마 검증이 수작업

### 해결 방향
- Virtual Diagram ↔ Real Diagram 비교로 스키마 Diff 자동 감지
- Package 기반 환경별(DEV/STG/PROD) 연결 정보 그룹핑
- DDL 버전 관리 + React Flow 기반 시각적 스키마 편집
- 통합 문서화 및 Export(Markdown, PDF, 이미지)
- 스키마 검증과 Mock 데이터 생성 워크플로우 제공

---

## 3. Scope Definition

### In Scope (MVP)

#### 3.1 전체 앱 네비게이션 구조
- **사이드바**: API, CODE, DB, INFRA 4대 영역 항목 표시
- **상단 네비게이션**: 각 서비스별 독립적인 서브 네비게이션
- DB 영역만 기능 구현, 나머지는 Placeholder

#### 3.2 DB Tool 서브 네비게이션
| Navigation | Priority | Description |
|-----------|----------|-------------|
| Package | P0 | 환경별 리소스 그룹핑 관리 |
| Connection | P0 | MySQL, MariaDB, PostgreSQL 연결 관리 |
| Diagram | P0 | 스키마 설계 및 테이블 구조 시각화 |
| Query | P1 | SQL 쿼리 편집/실행/결과 조회 |
| Documenting | P1 | DB 구조 문서 관리 및 Export |
| Validation | P2 | 스키마/구조 검증 워크플로우 |
| Mocking | P2 | Mock 데이터 생성 워크플로우 |

#### 3.3 Package 서비스
- 패키지 CRUD (생성, 조회, 수정, 삭제)
- 최소 1개 패키지 필수 (Default Package)
- 패키지 내 리소스 연결: Connection, Diagram, Query, Documenting
- 리소스 공유: 동일 Diagram/Query/Documenting을 여러 패키지에서 공유 가능
- 환경별 관리 예시: DEV, STG, PROD 패키지별 다른 Connection, 동일 Diagram

#### 3.4 Connection 서비스
- 지원 DB: MySQL, MariaDB, PostgreSQL
- 연결 정보: Host, Port, Database Name, Username, Password, SSL 옵션
- 연결 테스트 기능
- 연결 정보 암호화 저장 (로컬)
- 연결 상태 모니터링 (Connected/Disconnected)

#### 3.5 Diagram 서비스
- **Virtual Diagram**: 로컬에서 설계하는 테이블 구조
  - 테이블 CRUD
  - 컬럼 속성: Column Name, Data Type, Key(PK/FK/UK/IDX), Default, Nullable, Comment, References(FK), Constraints
  - React Flow 기반 테이블간 관계 시각화 및 드래그/드롭 조작
  - DDL 문 기반 편집 (SQL 에디터에서 DDL 작성 → Diagram 반영)
  - DDL 버전 관리 (히스토리)
- **Real Diagram**: 실제 DB에서 조회한 테이블 구조
  - Connection 통해 DB 메타데이터 조회 (information_schema)
  - 실시간 DB 구조 시각화
- **Diff 비교**: Virtual ↔ Real 차이점 감지 및 시각화
  - 테이블/컬럼 추가/삭제/변경 감지
  - Migration DDL 생성 제안

#### 3.6 Query 서비스
- SQL 쿼리 에디터 (구문 강조, 자동완성)
- 쿼리 저장 및 관리 (이름, 설명, 태그)
- 쿼리 실행 및 결과 테이블 표시
- 실행 이력 관리
- 다중 쿼리 탭 지원

#### 3.7 Documenting 서비스
- DB 구조 자동 문서 생성 (테이블/컬럼/관계 기반)
- Markdown 에디터로 추가 설명 편집
- Export: Markdown, PDF, 이미지(PNG/SVG)
- 테이블/컬럼별 상세 설명 관리

#### 3.8 Validation 서비스
- Virtual Diagram ↔ Real Diagram 정합성 검증
- 데이터 타입 호환성 검사
- FK 참조 무결성 검증
- 인덱스 최적화 제안
- 검증 결과 리포트

#### 3.9 Mocking 서비스
- 스키마 기반 Mock 데이터 자동 생성
- 데이터 타입별 적절한 샘플 데이터
- 레코드 수 지정
- INSERT SQL 생성
- CSV/JSON Export

### Out of Scope (MVP 이후)
- API, Code, Infra 서비스 구현
- NoSQL (MongoDB, Redis 등) 지원
- 클라우드 DB 직접 프로비저닝
- 실시간 DB 모니터링/알림
- 다중 사용자 협업
- DB Migration 자동 실행 (생성까지만)

---

## 4. User Stories

### US-01: Package 관리
> 개발자로서, 환경별(DEV/STG/PROD) DB 리소스를 패키지로 그룹핑하여 관리하고 싶다.
- **AC-01**: 패키지를 생성/수정/삭제할 수 있다.
- **AC-02**: 패키지에 Connection, Diagram, Query, Documenting을 연결할 수 있다.
- **AC-03**: 동일한 Diagram을 여러 패키지에서 공유할 수 있다.
- **AC-04**: 기본 패키지가 1개 이상 존재해야 한다.

### US-02: DB Connection 관리
> 개발자로서, MySQL/MariaDB/PostgreSQL에 대한 연결 정보를 관리하고 연결 테스트를 하고 싶다.
- **AC-05**: DB 종류 선택 후 연결 정보(Host, Port, DB, User, Password, SSL)를 입력할 수 있다.
- **AC-06**: 연결 테스트 버튼으로 접속 가능 여부를 확인할 수 있다.
- **AC-07**: 연결 정보는 로컬에 암호화 저장된다.
- **AC-08**: 연결 상태(Connected/Disconnected)를 실시간으로 확인할 수 있다.

### US-03: Virtual Diagram 설계
> 개발자로서, DB 스키마를 시각적으로 설계하고 DDL로도 편집하고 싶다.
- **AC-09**: 테이블을 생성하고 컬럼(Name, Type, Key, Default, Nullable, Comment, References, Constraints)을 정의할 수 있다.
- **AC-10**: React Flow 캔버스에서 테이블을 드래그/드롭하고 관계선을 연결할 수 있다.
- **AC-11**: DDL 에디터에서 SQL문으로 스키마를 편집하면 Diagram에 반영된다.
- **AC-12**: DDL 변경 히스토리를 버전별로 관리할 수 있다.

### US-04: Real Diagram 조회
> 개발자로서, 실제 DB의 현재 스키마 구조를 시각적으로 확인하고 싶다.
- **AC-13**: Connection을 통해 실제 DB의 테이블/컬럼/관계 정보를 조회할 수 있다.
- **AC-14**: Real Diagram을 React Flow 캔버스에서 시각적으로 확인할 수 있다.

### US-05: Diagram Diff
> 개발자로서, 설계(Virtual)와 실제(Real) DB의 차이를 한눈에 파악하고 싶다.
- **AC-15**: Virtual ↔ Real 간 테이블/컬럼 추가/삭제/변경을 시각적으로 표시한다.
- **AC-16**: Diff 기반 Migration DDL을 자동 생성/제안한다.

### US-06: Query 실행
> 개발자로서, SQL 쿼리를 작성/저장하고 실행 결과를 확인하고 싶다.
- **AC-17**: SQL 에디터에서 쿼리를 작성하고 실행할 수 있다.
- **AC-18**: 쿼리 결과를 테이블 형태로 확인할 수 있다.
- **AC-19**: 쿼리를 이름/설명과 함께 저장하고 관리할 수 있다.
- **AC-20**: 실행 이력을 확인할 수 있다.

### US-07: DB 문서화
> 개발자로서, DB 구조에 대한 문서를 자동 생성하고 추가 설명을 편집하고 싶다.
- **AC-21**: 현재 스키마 기반으로 문서를 자동 생성할 수 있다.
- **AC-22**: Markdown 에디터로 테이블/컬럼별 상세 설명을 추가할 수 있다.
- **AC-23**: Markdown, PDF, 이미지(PNG/SVG)로 Export할 수 있다.

### US-08: 스키마 검증
> 개발자로서, Virtual Diagram과 Real DB 간의 정합성을 자동 검증하고 싶다.
- **AC-24**: Virtual ↔ Real 정합성 검증을 실행할 수 있다.
- **AC-25**: 검증 결과 리포트를 확인할 수 있다.

### US-09: Mock 데이터 생성
> 개발자로서, 스키마 기반으로 테스트 데이터를 자동 생성하고 싶다.
- **AC-26**: 테이블 선택 후 Mock 데이터를 자동 생성할 수 있다.
- **AC-27**: INSERT SQL 또는 CSV/JSON으로 Export할 수 있다.

---

## 5. Tech Stack & Dependencies

### Existing Stack
| Category | Technology |
|----------|-----------|
| Runtime | Electron 40.1.0 |
| Renderer | React 19.2.4 + TypeScript 5.9.3 |
| Build | Vite 7.3.1 + Electron Forge |
| Styling | TailwindCSS 4.1.18 + Radix UI |
| State | Zustand 5.0.11 + TanStack React Query |
| Architecture | FSD (Renderer) + Layered (Main) |

### New Dependencies (예상)
| Package | Purpose | Layer |
|---------|---------|-------|
| `@xyflow/react` (React Flow) | 다이어그램 시각화/조작 | Renderer |
| `mysql2` | MySQL/MariaDB 연결 | Main |
| `pg` | PostgreSQL 연결 | Main |
| `codemirror` / `@uiw/react-codemirror` | SQL 에디터 (DDL, Query) | Renderer |
| `better-sqlite3` | 로컬 메타데이터 저장 | Main |
| `electron-store` 또는 `safeStorage` | 연결 정보 암호화 저장 | Main |
| `jspdf` + `html2canvas` | PDF/이미지 Export | Renderer |
| `sql-formatter` | SQL 포맷팅 | Shared |

---

## 6. Architecture Overview

### 전체 앱 레이아웃
```
┌──────────────────────────────────────────────────┐
│  Title Bar (Electron)                            │
├──────┬───────────────────────────────────────────┤
│      │  [Package] [Connection] [Diagram] ...     │  ← DB 서비스 상단 네비게이션
│  S   ├───────────────────────────────────────────┤
│  I   │                                           │
│  D   │            Service Content Area           │
│  E   │                                           │
│  B   │                                           │
│  A   │                                           │
│  R   │                                           │
│      │                                           │
├──────┴───────────────────────────────────────────┤
│  Status Bar                                      │
└──────────────────────────────────────────────────┘

Sidebar: [API] [CODE] [DB*] [INFRA]  (* = active)
```

### FSD 슬라이스 구조 (Renderer)
```
renderer/
├── pages/
│   ├── db-package/             # Package 관리 페이지
│   ├── db-connection/          # Connection 관리 페이지
│   ├── db-diagram/             # Diagram 페이지 (Virtual/Real/Diff)
│   ├── db-query/               # Query 에디터 페이지
│   ├── db-documenting/         # 문서화 페이지
│   ├── db-validation/          # 검증 워크플로우 페이지
│   └── db-mocking/             # Mock 생성 페이지
│
├── widgets/
│   ├── app-sidebar/            # 전체 앱 사이드바 (API/CODE/DB/INFRA)
│   ├── db-top-nav/             # DB 서비스 상단 네비게이션
│   ├── diagram-canvas/         # React Flow 다이어그램 캔버스
│   ├── sql-editor/             # CodeMirror SQL 에디터
│   └── query-result-table/     # 쿼리 결과 테이블
│
├── features/
│   ├── package-management/     # 패키지 CRUD + 리소스 연결
│   ├── db-connection/          # DB 연결 관리 + 테스트
│   ├── virtual-diagram/        # Virtual Diagram 편집
│   ├── real-diagram/           # Real Diagram 조회
│   ├── diagram-diff/           # Virtual ↔ Real Diff
│   ├── ddl-editor/             # DDL 편집 + 버전 관리
│   ├── query-execution/        # 쿼리 실행 + 결과
│   ├── db-documenting/         # 문서 편집 + Export
│   ├── schema-validation/      # 스키마 검증
│   └── data-mocking/           # Mock 데이터 생성
│
├── entities/
│   ├── package/                # Package 엔티티
│   ├── connection/             # Connection 엔티티
│   ├── table/                  # Table 엔티티 (Virtual/Real)
│   ├── column/                 # Column 엔티티
│   ├── query/                  # Query 엔티티
│   └── document/               # Document 엔티티
│
└── shared/                     # 기존 공유 레이어 확장
```

### Main Process (Layered Architecture)
```
main/
├── ipc/handlers/
│   ├── connectionHandlers.ts   # DB 연결 관련 IPC
│   ├── schemaHandlers.ts       # 스키마 조회/비교 IPC
│   ├── queryHandlers.ts        # 쿼리 실행 IPC
│   └── storageHandlers.ts      # 로컬 데이터 저장 IPC
│
├── services/
│   ├── connectionService.ts    # DB 연결 관리 로직
│   ├── schemaService.ts        # 스키마 조회/비교 로직
│   ├── queryService.ts         # 쿼리 실행 로직
│   ├── diffService.ts          # Virtual ↔ Real Diff 로직
│   └── exportService.ts        # 문서 Export 로직
│
├── repositories/
│   ├── packageRepository.ts    # 패키지 데이터 접근
│   ├── connectionRepository.ts # 연결 정보 데이터 접근
│   ├── diagramRepository.ts    # 다이어그램 데이터 접근
│   ├── queryRepository.ts      # 쿼리 데이터 접근
│   └── documentRepository.ts   # 문서 데이터 접근
│
└── infrastructure/
    ├── database/
    │   ├── localDb.ts          # 로컬 SQLite (메타데이터 저장)
    │   ├── mysqlClient.ts      # MySQL/MariaDB 클라이언트
    │   └── pgClient.ts         # PostgreSQL 클라이언트
    ├── crypto.ts               # 연결 정보 암호화
    └── filesystem.ts           # 파일 I/O (기존)
```

---

## 7. Data Model (High-Level)

### 로컬 저장소 (SQLite)
```
packages
├── id (PK)
├── name
├── description
├── created_at / updated_at

package_resources (N:M 연결)
├── id (PK)
├── package_id (FK → packages)
├── resource_type (connection | diagram | query | document)
├── resource_id
├── is_shared (Boolean)

connections
├── id (PK)
├── name
├── db_type (mysql | mariadb | postgresql)
├── host, port, database, username
├── encrypted_password
├── ssl_enabled, ssl_config (JSON)
├── created_at / updated_at

diagrams
├── id (PK)
├── name
├── type (virtual | real)
├── schema_data (JSON - tables, columns, relations)
├── layout_data (JSON - React Flow positions)
├── created_at / updated_at

diagram_versions
├── id (PK)
├── diagram_id (FK → diagrams)
├── version_number
├── ddl_content (TEXT)
├── schema_snapshot (JSON)
├── created_at

queries
├── id (PK)
├── name
├── description
├── sql_content (TEXT)
├── tags (JSON)
├── created_at / updated_at

query_history
├── id (PK)
├── query_id (FK → queries, nullable)
├── sql_content
├── execution_time_ms
├── row_count
├── status (success | error)
├── error_message
├── executed_at

documents
├── id (PK)
├── name
├── content (TEXT - Markdown)
├── auto_generated (Boolean)
├── created_at / updated_at
```

---

## 8. Implementation Phases

### Phase 1: 앱 기본 레이아웃 + 네비게이션 (Week 1)
- [ ] 앱 사이드바 (API/CODE/DB/INFRA)
- [ ] DB 서비스 상단 네비게이션
- [ ] 라우팅 구조 설정
- [ ] 기본 페이지 레이아웃

### Phase 2: 로컬 저장소 + Package + Connection (Week 2)
- [ ] SQLite 로컬 DB 셋업
- [ ] Package CRUD
- [ ] Connection CRUD + 연결 테스트
- [ ] 연결 정보 암호화

### Phase 3: Diagram - Virtual (Week 3-4)
- [ ] React Flow 캔버스 통합
- [ ] 테이블 노드 컴포넌트 (컬럼 속성 편집)
- [ ] 관계선(Edge) 연결 및 FK 설정
- [ ] DDL 에디터 + Diagram 동기화
- [ ] DDL 버전 관리

### Phase 4: Diagram - Real + Diff (Week 5)
- [ ] DB 스키마 메타데이터 조회 (information_schema)
- [ ] Real Diagram 시각화
- [ ] Virtual ↔ Real Diff 비교 엔진
- [ ] Diff 시각화 + Migration DDL 제안

### Phase 5: Query (Week 6)
- [ ] CodeMirror SQL 에디터 통합
- [ ] 쿼리 실행 + 결과 테이블
- [ ] 쿼리 저장/관리
- [ ] 실행 이력

### Phase 6: Documenting (Week 7)
- [ ] 스키마 기반 자동 문서 생성
- [ ] Markdown 에디터
- [ ] PDF/이미지 Export

### Phase 7: Validation + Mocking (Week 8)
- [ ] 스키마 정합성 검증 워크플로우
- [ ] Mock 데이터 생성기
- [ ] INSERT SQL / CSV / JSON Export

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| React Flow 학습 곡선 | Medium | 공식 문서 + 예제 기반 점진적 도입 |
| DB 드라이버 호환성 (Electron) | High | Main Process에서만 DB 접속, IPC 통신 |
| 대규모 스키마 성능 | Medium | 가상화 렌더링, 레이지 로딩 |
| DDL 파싱 복잡도 | Medium | 라이브러리 활용 (sql-ddl-to-json 등) |
| 연결 정보 보안 | High | Electron safeStorage + 로컬 암호화 |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| 3종 DB 연결 성공률 | MySQL, MariaDB, PostgreSQL 모두 연결 가능 |
| Diagram 동기화 정확도 | DDL ↔ Visual 간 양방향 동기화 100% |
| Diff 감지 정확도 | Virtual ↔ Real 차이 100% 감지 |
| 쿼리 실행 | SELECT/INSERT/UPDATE/DELETE 정상 실행 |
| Export | Markdown, PDF, 이미지 정상 출력 |
| 코드 커버리지 | Core Services 90%+, UI 70%+ |

---

## 11. Dependencies & Assumptions

### Dependencies
- Electron Main Process에서 네이티브 DB 드라이버 사용 가능
- React Flow v12+ 안정 버전
- CodeMirror 6 SQL 언어 지원

### Assumptions
- 단일 사용자 데스크톱 앱 (멀티 유저 X)
- 로컬 저장소(SQLite)로 메타데이터 관리
- DB 연결은 Main Process에서만 처리 (보안)
- 초기 MVP는 읽기/쿼리 위주, 스키마 변경은 DDL 생성까지만 (자동 실행 X)
