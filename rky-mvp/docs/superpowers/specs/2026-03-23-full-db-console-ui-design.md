# Full DB Console — UI/UX Design Spec

> Date: 2026-03-23
> Based on: 2026-03-23-full-db-console-feature-matrix.md
> Current Stack: React 18, Tailwind CSS, Radix UI, CodeMirror v6, TanStack Table, @dnd-kit, Zustand, React Query

---

## 0. Design Philosophy

- **기존 Query 서비스 100% 유지** — Query 탭은 AS-IS 그대로 보존
- **Console = 신규 탭** — Object CRUD, DBA, Monitor, Data Ops를 Console 탭에 통합
- **DBeaver-inspired but modern** — 트리 기반 오브젝트 브라우저 + 멀티탭 에디터
- **Progressive disclosure** — 벤더/권한에 따라 UI 동적 노출
- **Consistent patterns** — 모든 오브젝트에 동일한 CRUD 패턴 적용

---

## 1. Overall Layout

### 현재 (AS-IS) — 변경 없음
```
┌──────────────────────────────────────────────────────────────┐
│  Connection │ Diagram │ Data │ Query        [connection info] │
├──────────────────────────────────────────────────────────────┤
│  [Query] [Collection] [History]   ← sub-tabs                 │
├──────────┬───────────────────────────────────────────────────┤
│ FileTree │  SQL Editor + Results                    │ Schema │
│ (queries)│                                          │ Panel  │
│          │                                          │(toggle)│
└──────────┴───────────────────────────────────────────────────┘
```
**Query 탭은 기존 코드 그대로 유지. 수정/리팩토링 없음.**

### 신규: Console 탭 (TO-BE)
```
┌──────────────────────────────────────────────────────────────────────┐
│  Connection │ Diagram │ Data │ Query │ Console        [conn badge]   │
│                                (AS-IS)  (NEW)                        │
├────┬─────────────────────────────────────────────────────────────────┤
│ N  │  ┌─ Tab1 ─┐ ┌─ Tab2 ─┐ ┌─ Tab3 ─┐           [⌘K] [⚙]       │
│ A  ├──┴────────┴──┴────────┴──┴────────┴─────────────────────────────┤
│ V  │                                                                  │
│    │                    MAIN CONTENT AREA                              │
│ B  │              (selected tab's content)                            │
│ A  │                                                                  │
│ R  │                                                                  │
│    ├──────────────────────────────────────────────────────────────────┤
│    │  ⌄ Output │ Messages                     [height: resizable]    │
│    │  Result grid / execution messages                                │
└────┴──────────────────────────────────────────────────────────────────┘
```

### Query vs Console 역할 분리

| | Query (기존) | Console (신규) |
|---|---|---|
| **목적** | SQL 작성/실행/관리 | DB 오브젝트/관리/모니터링 |
| **대상 유저** | 개발자, DBA | DBA, 운영자 |
| **핵심 기능** | SQL Editor, Collection, History | Object CRUD, User/Grant, Session, Stats |
| **좌측 패널** | FileTree (쿼리/컬렉션) | Nav Bar + Side Panel (Object/DBA/Monitor) |
| **결과 표시** | 에디터 아래 인라인 | Bottom Output Panel |
| **상태 관리** | queryBrowserStore (기존) | consoleBrowserStore (신규) |

### 핵심 설계 원칙
1. **Query 탭 코드 zero-touch** — 기존 파일 수정 없음
2. **Console은 독립 feature** — `src/renderer/features/console-browser/` 신규
3. **공유 컴포넌트만 재사용** — DataGrid, CodeMirror, Dialog 등
4. **라우팅 추가** — `/db/console/admin` (Console 페이지)

---

## 2. Navigation Bar (Console 탭 좌측 아이콘 바)

> Console 탭 전용. Query 탭에는 영향 없음.

### Layout
```
┌────┐
│ 📦 │  ← Object Browser (스키마 오브젝트)
│ 👤 │  ← DBA (유저/권한/설정)
│ 📊 │  ← Monitor (세션/성능/통계)
│ 📥 │  ← Data Ops (Import/Export)
│    │
│ ─  │  ← divider
│ ⚙ │  ← Console Settings
└────┘
```

### Spec
- Width: 40px (고정)
- 아이콘: lucide-react, size-4 (16px)
- Active 상태: `bg-accent`, `text-foreground`
- Hover: `bg-accent/50`
- Tooltip: 아이콘 hover 시 이름 표시
- 각 아이콘 클릭 → 좌측에 해당 패널 토글 (VSCode Activity Bar 방식)
- SQL 에디터는 Nav에 없음 — **Query 탭**에서 접근

### 아이콘-패널 매핑

| Icon | Panel | Width | Content |
|------|-------|-------|---------|
| Database | Object Browser | 240px | 스키마 오브젝트 트리 (기본 활성) |
| Users | DBA Panel | 240px | 유저/역할/권한 트리 |
| Activity | Monitor Panel | 240px | 세션/통계 바로가기 |
| ArrowDownToLine | Data Ops Panel | 240px | Import/Export 바로가기 |

---

## 3. Query 탭과의 연동

> SQL 에디터는 Console에 포함하지 않음. **Query 탭(기존)**에서 접근.

### Console → Query 탭 연동 포인트

| Console 액션 | 동작 |
|-------------|------|
| Object Browser에서 "View Data" 클릭 | Query 탭으로 전환 + `SELECT * FROM table LIMIT 50` 실행 |
| Object Browser에서 "Script as CREATE" | Query 탭으로 전환 + 새 쿼리에 DDL 삽입 |
| EXPLAIN 결과에서 "Open in Editor" | Query 탭으로 전환 + 해당 SQL 로드 |
| Monitor에서 쿼리 복사 후 "Run in Editor" | Query 탭으로 전환 + SQL 삽입 |

### 연동 구현 방식
```typescript
// 공유 이벤트 버스 또는 store
interface CrossTabAction {
  type: 'openInQueryEditor'
  payload: { sql: string; autoRun?: boolean }
}
// Console에서 dispatch → Query 탭에서 수신
```

---

## 4. Object Browser Panel (Nav: 📦)

### 벤더에 따라 동적으로 노드 구성

```
┌────────────────────────┐
│ OBJECTS                │
├────────────────────────┤
│ 🔍 Search objects...   │
├────────────────────────┤
│ 📋 Schema: public  ▾  │  ← PG only (schema selector)
├────────────────────────┤
│ ▸ 🗂 Tables (42)       │
│ ▸ 👁 Views (8)         │
│ ▸ 🔮 Materialized (3)  │  ← PG only
│ ▸ ⚡ Functions (15)     │
│ ▸ 📜 Procedures (5)    │
│ ▸ ⏰ Triggers (12)     │
│ ▸ 🔢 Sequences (7)     │  ← PG + MariaDB
│ ▸ 📅 Events (2)        │  ← MySQL/MariaDB only
│ ▸ 🏷 Types (4)         │  ← PG only
│ ▸ 🧩 Extensions (6)    │  ← PG only
│ ▸ 🛡 Policies (3)      │  ← PG only
│ ▸ 🌐 Domains (1)       │  ← PG only
├────────────────────────┤
│ [↻ Refresh]            │
└────────────────────────┘
```

### 트리 확장 시

```
│ ▾ 🗂 Tables (42)       │
│   ├ users              │
│   │ ├ 🔑 id (int4)     │  ← PK icon
│   │ ├ → email (varchar)│  ← FK icon (→)
│   │ ├ · name (varchar) │
│   │ └ · created_at (ts)│
│   ├ orders             │
│   │ ├ 🔑 id (int4)     │
│   │ └ ...              │
│   └ products           │
```

### 오브젝트 상호작용

| Level | Action | Behavior |
|-------|--------|----------|
| 카테고리 (Tables, Functions 등) | 클릭 | 트리 확장/축소 |
| 카테고리 | 우클릭 | Create New + Refresh |
| 오브젝트 (users, get_user 등) | 클릭 | 탭 열기 (상세/에디터) |
| 오브젝트 | 우클릭 | 타입별 컨텍스트 메뉴 (아래) |
| 컬럼 | 클릭 | Query 탭 활성 에디터에 컬럼명 삽입 |

### 컨텍스트 메뉴 (오브젝트 타입별)

#### 카테고리 헤더 (모든 타입 공통)
```
┌─────────────────────┐
│ ＋ Create New...     │
│ ↻ Refresh           │
└─────────────────────┘
```

#### Table / View
```
┌─────────────────────┐
│ 📝 Open Detail       │  ← 탭 열기 (Columns, Constraints, DDL 등)
│ 👁 View Data         │  ← Query 탭에서 SELECT * LIMIT 50
│ 📋 Copy Name         │
│ ─────────────────── │
│ 📜 Script as CREATE  │  ← DDL 클립보드 복사
│ 📜 Script as DROP    │
│ ─────────────────── │
│ 📊 Statistics        │  ← 행 수, 크기, dead tuple 등
│ 🧹 Vacuum / Optimize │  ← PG: VACUUM / MySQL: OPTIMIZE TABLE
│ ─────────────────── │
│ ✏️ Rename             │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Materialized View (PG only)
```
┌─────────────────────┐
│ 📝 Open Detail       │
│ 👁 View Data         │
│ 📋 Copy Name         │
│ ─────────────────── │
│ 🔄 Refresh Data      │  ← REFRESH MATERIALIZED VIEW
│ 🔄 Refresh Concurrent│  ← REFRESH ... CONCURRENTLY
│ ─────────────────── │
│ 📜 Script as CREATE  │
│ 📜 Script as DROP    │
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Function / Procedure
```
┌─────────────────────┐
│ 📝 Open Editor       │  ← 코드 에디터 탭 열기
│ ▶ Execute            │  ← 파라미터 입력 후 실행
│ 📋 Copy Name         │
│ ─────────────────── │
│ 📜 Script as CREATE  │
│ 📜 Script as DROP    │
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Trigger
```
┌─────────────────────┐
│ 📝 Open Editor       │  ← 트리거 설정 + 함수 본문 에디터
│ 📋 Copy Name         │
│ ─────────────────── │
│ ⏸ Disable            │  ← PG only: ALTER TABLE ... DISABLE TRIGGER
│ ▶ Enable             │  ← PG only: ALTER TABLE ... ENABLE TRIGGER
│ ─────────────────── │
│ 📜 Script as CREATE  │
│ 📜 Script as Drop    │
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Sequence
```
┌─────────────────────┐
│ 📝 Open Detail       │  ← 속성 조회 (current value, increment 등)
│ 📋 Copy Name         │
│ ─────────────────── │
│ 🔄 Reset Value       │  ← ALTER SEQUENCE ... RESTART
│ ⏭ Set Value...       │  ← setval() / ALTER SEQUENCE ... RESTART WITH
│ ─────────────────── │
│ 📜 Script as CREATE  │
│ 📜 Script as DROP    │
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Event (MySQL/MariaDB only)
```
┌─────────────────────┐
│ 📝 Open Editor       │  ← 스케줄 + SQL 본문 에디터
│ 📋 Copy Name         │
│ ─────────────────── │
│ ⏸ Disable            │  ← ALTER EVENT ... DISABLE
│ ▶ Enable             │  ← ALTER EVENT ... ENABLE
│ ─────────────────── │
│ 📜 Script as CREATE  │
│ 📜 Script as Drop    │
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Extension (PG only)
```
┌─────────────────────┐
│ 📝 Open Detail       │  ← 버전, 소속 오브젝트 목록
│ 📋 Copy Name         │
│ ─────────────────── │
│ ⬆ Update Version     │  ← ALTER EXTENSION ... UPDATE
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

#### Type / Domain / Policy (PG only)
```
┌─────────────────────┐
│ 📝 Open Editor       │
│ 📋 Copy Name         │
│ ─────────────────── │
│ 📜 Script as CREATE  │
│ 📜 Script as Drop    │
│ ─────────────────── │
│ 🗑 Drop               │
└─────────────────────┘
```

---

## 5. Main Content Area — Nav별 동작 방식

### 핵심 원칙
- **📦 Object Browser → Multi-Tab** (여러 오브젝트를 열어두고 전환)
- **👤 DBA / 📊 Monitor / 📥 Data Ops → 단일 뷰** (좌측 클릭 시 우측이 바뀜)

### Nav 전환 시 동작
```
📦 Object Browser 활성 → 탭 바 표시 ([users] [get_user()] ...)
👤 DBA 클릭            → 탭 바 사라짐, DBA 고정 화면 표시
📦 다시 클릭            → 탭 바 복원 (이전 탭들 그대로 유지)
```

---

### 5.1 Object Browser — Multi-Tab

#### 탭 바
```
┌─ 🗂 users ──┐┌─ ⚡ get_user() ──┐┌─ ⏰ trg_audit ──┐
└──────────────┘└──────────────────┘└─────────────────┘
```

#### 탭 유형별 아이콘

| Type | Icon | Tab Label |
|------|------|-----------|
| Table Detail | Table2 | 테이블명 |
| Function Editor | Zap | 함수명() |
| Procedure Editor | ScrollText | 프로시저명() |
| Trigger Editor | Timer | 트리거명 |
| Sequence Detail | Hash | 시퀀스명 |
| Event Editor | CalendarClock | 이벤트명 |
| Materialized View | Layers | 뷰명 |
| Extension Detail | Puzzle | 확장명 |
| Type Editor | Tag | 타입명 |

#### 탭 동작
- 좌측 Object Browser에서 항목 클릭 → 탭 생성 (이미 열려있으면 해당 탭 활성화)
- 클릭: 탭 활성화
- 중클릭 (마우스 휠): 탭 닫기
- 수정된 탭: 탭 이름 옆에 `●` 표시 (unsaved dot)
- 탭 우클릭: Close / Close Others / Close All

---

### 5.2 DBA — 단일 뷰

```
┌────┬──────────────┬──────────────────────────────────────┐
│ 📦 │ ▸ Users (12) │                                      │
│[👤]│ ▸ Roles (5)  │  Users 목록 + 상세 화면               │
│ 📊 │ ▸ Privileges │  (좌측에서 다른 항목 클릭하면           │
│ 📥 │ ▸ Variables  │   이 영역이 통째로 바뀜)               │
│    │ ▸ Databases  │                                      │
└────┴──────────────┴──────────────────────────────────────┘
```

탭 바 없음. 좌측 트리에서 클릭하면 우측 전체가 해당 화면으로 전환.

---

### 5.3 Monitor — 단일 뷰

```
┌────┬──────────────┬──────────────────────────────────────┐
│ 📦 │ ▸ Sessions   │                                      │
│ 👤 │ ▸ Locks      │  Active Sessions 대시보드              │
│[📊]│ ▸ Table Stats│  (좌측에서 다른 항목 클릭하면           │
│ 📥 │ ▸ Index Stats│   이 영역이 통째로 바뀜)               │
│    │ ▸ Server     │                                      │
└────┴──────────────┴──────────────────────────────────────┘
```

탭 바 없음. 동일한 단일 뷰 패턴.

---

### 5.4 Data Ops — 단일 뷰

```
┌────┬──────────────┬──────────────────────────────────────┐
│ 📦 │ 📤 Export    │                                      │
│ 👤 │ 📥 Import    │  Export Wizard (3-step)               │
│ 📊 │ 💾 SQL Dump  │  (좌측에서 다른 항목 클릭하면           │
│[📥]│ 📂 Restore   │   이 영역이 통째로 바뀜)               │
└────┴──────────────┴──────────────────────────────────────┘
```

탭 바 없음. 위자드 형태의 단일 뷰.

---

## 6. Query 탭 추가 기능

> Query 탭 자체는 기존 유지. 아래 기능만 추가.

### 6.0.1 SQL 포매팅 버튼
- 에디터 툴바에 `[🎨 Format]` 버튼 추가
- 클릭 시 에디터 내 SQL을 자동 정리 (들여쓰기, 대소문자, 줄바꿈)
- `sql-formatter` 라이브러리 사용, 벤더별 dialect 지정

### 6.0.2 EXPLAIN 버튼
- 에디터 툴바에 `[⚡ Explain]` 버튼 추가
- 쿼리를 **실행하지 않고** 예상 실행 계획만 조회
- 결과를 DataGrid 영역에 표시

### 6.0.3 EXPLAIN ANALYZE (Run에 항상 포함)
- Run(`▶`) 실행 시 **자동으로 EXPLAIN ANALYZE 동반** (토글 없음, 항상 on)
- 결과 DataGrid **위에** 실행 계획 요약 한 줄 표시
- History에도 실행 계획 정보 함께 저장

```
┌──────────────────────────────────────────────────────────────────┐
│ [▶ Run] [🎨 Format] [⚡ Explain]                                 │
├──────────────────────────────────────────────────────────────────┤
│  (SQL Editor - 기존 그대로)                                       │
├──────────────────────────────────────────────────────────────────┤
│ ✅ 12 rows · 45ms · Seq Scan on users · Rows Removed: 902       │ ← ANALYZE 요약
├──────────────────────────────────────────────────────────────────┤
│ id │ name  │ email          │ created_at                         │ ← DataGrid
│────┼───────┼────────────────┼──────────                          │
│ 1  │ Alice │ alice@test.com │ 2026-01-15                         │
│ ...                                                               │
└──────────────────────────────────────────────────────────────────┘
```

### Query 탭 툴바 (변경 후)
```
[▶ Run] [🎨 Format] [⚡ Explain] [Keywords ▾] [Schema ▾]
```

---

## 6.1 Tab Content Views (Console 탭 — Object Browser Multi-Tab 전용)

### 6.2 Table Detail View

```
┌──────────────────────────────────────────────────────────────────┐
│ 🗂 users                        [✏️ ALTER] [📜 DDL] [🗑 DROP]    │
├──────────────────────────────────────────────────────────────────┤
│ [Columns] [Constraints] [Indexes] [Triggers] [Statistics] [DDL] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Columns Tab ─────────────────────────────────────────────┐  │
│  │ # │ Name       │ Type      │ Nullable │ Default │ PK │ FK │  │
│  │───┼────────────┼───────────┼──────────┼─────────┼────┼────│  │
│  │ 1 │ id         │ int4      │ NO       │ nextval │ 🔑 │    │  │
│  │ 2 │ email      │ varchar   │ NO       │         │    │    │  │
│  │ 3 │ name       │ varchar   │ YES      │ NULL    │    │    │  │
│  │ 4 │ role_id    │ int4      │ NO       │         │    │ →  │  │
│  │ 5 │ created_at │ timestamp │ NO       │ now()   │    │    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [+ Add Column]                                                  │
│                                                                  │
│  ┌─ Constraints Tab ────────────────────────────────────────┐   │
│  │ Name          │ Type │ Columns        │ References       │   │
│  │───────────────┼──────┼────────────────┼──────────────────│   │
│  │ users_pkey    │ PK   │ id             │                  │   │
│  │ users_email_u │ UK   │ email          │                  │   │
│  │ users_role_fk │ FK   │ role_id        │ roles(id)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Statistics Tab ─────────────────────────────────────────┐   │
│  │ Row Count (est)  │ 12,450                                │   │
│  │ Total Size       │ 4.2 MB                                │   │
│  │ Data Size        │ 3.1 MB                                │   │
│  │ Index Size       │ 1.1 MB                                │   │
│  │ Dead Tuples      │ 234 (1.8%)       [🧹 Vacuum]         │   │
│  │ Last Analyzed    │ 2026-03-23 10:30                      │   │
│  │ Seq Scans        │ 1,205                                 │   │
│  │ Idx Scans        │ 45,678                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ DDL Tab ────────────────────────────────────────────────┐   │
│  │ CREATE TABLE public.users (                              │   │
│  │   id integer NOT NULL DEFAULT nextval('users_id_seq'),   │   │
│  │   email varchar(255) NOT NULL,                           │   │
│  │   name varchar(100),                                     │   │
│  │   ...                                                    │   │
│  │ );                                     [📋 Copy] [💾 Save]│  │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Function/Procedure Editor

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚡ get_user_by_email          [💾 Save] [▶ Test] [📜 DDL] [🗑]   │
├──────────────────────────────────────────────────────────────────┤
│ [Definition] [Parameters] [Options] [DDL]                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Definition Tab ─────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Language: [plpgsql ▾]    Returns: [TABLE ▾]             │   │
│  │                                                           │   │
│  │  ┌─ Return Columns (RETURNS TABLE) ──────────────────┐   │   │
│  │  │ user_id  │ integer  │ [×]                         │   │   │
│  │  │ email    │ varchar  │ [×]                         │   │   │
│  │  │ name     │ varchar  │ [×]                         │   │   │
│  │  │ [+ Add Column]                                    │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │  ┌─ Function Body (CodeMirror) ──────────────────────┐   │   │
│  │  │  1 │ DECLARE                                      │   │   │
│  │  │  2 │   v_user RECORD;                             │   │   │
│  │  │  3 │ BEGIN                                        │   │   │
│  │  │  4 │   RETURN QUERY                               │   │   │
│  │  │  5 │   SELECT u.id, u.email, u.name               │   │   │
│  │  │  6 │   FROM users u                               │   │   │
│  │  │  7 │   WHERE u.email = p_email;                   │   │   │
│  │  │  8 │ END;                                         │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Parameters Tab ─────────────────────────────────────────┐   │
│  │ Direction │ Name     │ Type      │ Default │             │   │
│  │───────────┼──────────┼───────────┼─────────┼─────────────│   │
│  │ IN        │ p_email  │ varchar   │         │ [×]         │   │
│  │ [+ Add Parameter]                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Options Tab ────────────────────────────────────────────┐   │
│  │ Volatility:  (●) STABLE  ( ) IMMUTABLE  ( ) VOLATILE    │   │
│  │ Security:    (●) INVOKER  ( ) DEFINER                    │   │
│  │ Strict:      [✓] RETURNS NULL ON NULL INPUT              │   │
│  │ Parallel:    [UNSAFE ▾]                                  │   │
│  │ Cost:        [100    ]                                   │   │
│  │ Rows:        [1000   ]  (for SETOF/TABLE returns)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ DDL Tab (read-only, generated) ─────────────────────────┐   │
│  │ CREATE OR REPLACE FUNCTION public.get_user_by_email(     │   │
│  │   p_email varchar                                        │   │
│  │ ) RETURNS TABLE(user_id integer, email varchar, ...)     │   │
│  │ LANGUAGE plpgsql STABLE                                  │   │
│  │ AS $function$                                            │   │
│  │ ...                                                      │   │
│  │ $function$;                             [📋 Copy]        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.4 Trigger Editor (PG — 2-step unified)

```
┌──────────────────────────────────────────────────────────────────┐
│ ⏰ trg_audit_users              [💾 Save] [🔄 Toggle] [🗑 Drop]  │
├──────────────────────────────────────────────────────────────────┤
│ [Trigger Config] [Function Body] [DDL]                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Trigger Config Tab ─────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Table:   [users ▾]                                      │   │
│  │  Timing:  (●) BEFORE  ( ) AFTER  ( ) INSTEAD OF         │   │
│  │  Events:  [✓] INSERT  [✓] UPDATE  [ ] DELETE  [ ] TRUNC │   │
│  │  Level:   (●) FOR EACH ROW  ( ) FOR EACH STATEMENT      │   │
│  │                                                           │   │
│  │  ── PG only ──────────────────────────────────────────   │   │
│  │  UPDATE OF: [✓] email  [ ] name  [✓] status              │   │
│  │  WHEN:      [OLD.status IS DISTINCT FROM NEW.status   ]  │   │
│  │                                                           │   │
│  │  Status:    [● Enabled  ○ Disabled]                      │   │
│  │  Function:  [trg_audit_users_fn ▾] [Edit →]             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Function Body Tab (자동 연결된 트리거 함수) ────────────┐   │
│  │  1 │ BEGIN                                               │   │
│  │  2 │   INSERT INTO audit_log (                           │   │
│  │  3 │     table_name, operation, old_data, new_data       │   │
│  │  4 │   ) VALUES (                                        │   │
│  │  5 │     TG_TABLE_NAME, TG_OP,                           │   │
│  │  6 │     row_to_json(OLD), row_to_json(NEW)              │   │
│  │  7 │   );                                                │   │
│  │  8 │   RETURN NEW;                                       │   │
│  │  9 │ END;                                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── MySQL/MariaDB 버전 ──                                       │
│  ┌─ Trigger Config Tab ─────────────────────────────────────┐   │
│  │  Table:   [users ▾]                                      │   │
│  │  Timing:  (●) BEFORE  ( ) AFTER                          │   │
│  │  Event:   ( ) INSERT  (●) UPDATE  ( ) DELETE             │   │
│  │  Order:   [FOLLOWS trg_validate ▾]  (optional)           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ── Trigger Body (inline, no separate function) ──       │   │
│  │  1 │ BEGIN                                               │   │
│  │  2 │   SET NEW.updated_at = NOW();                       │   │
│  │  3 │ END                                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.5 Sequence Detail

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔢 users_id_seq                       [✏️ ALTER] [📜 DDL] [🗑]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Properties ─────────────────────────────────────────────┐   │
│  │ Data Type     │ bigint                                   │   │
│  │ Start Value   │ 1                                        │   │
│  │ Current Value │ 12,451                                   │   │
│  │ Increment     │ 1                                        │   │
│  │ Min Value     │ 1                                        │   │
│  │ Max Value     │ 9,223,372,036,854,775,807                │   │
│  │ Cache         │ 1                                        │   │
│  │ Cycle         │ No                                       │   │
│  │ Owned By      │ users.id  [→ Go to table]                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [🔄 Reset Value]  [⏭ Set Value: [_____] Apply]                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.6 Event Editor (MySQL/MariaDB)

```
┌──────────────────────────────────────────────────────────────────┐
│ 📅 cleanup_old_sessions         [💾 Save] [⏯ Toggle] [🗑 Drop]  │
├──────────────────────────────────────────────────────────────────┤
│ [Schedule] [SQL Body] [DDL]                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Schedule Tab ───────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Type:  (●) Recurring (EVERY)   ( ) One-time (AT)        │   │
│  │                                                           │   │
│  │  ── Recurring ──                                          │   │
│  │  Every: [1 ▾] [DAY ▾]                                    │   │
│  │  Starts: [2026-03-01 00:00 📅]  (optional)               │   │
│  │  Ends:   [                  📅]  (optional)               │   │
│  │                                                           │   │
│  │  ── One-time ──                                           │   │
│  │  At: [2026-04-01 00:00 📅]                                │   │
│  │                                                           │   │
│  │  Status:      [● Enabled  ○ Disabled]                     │   │
│  │  On Complete: [● Preserve  ○ Drop]                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ SQL Body Tab ───────────────────────────────────────────┐   │
│  │  1 │ DELETE FROM sessions                                │   │
│  │  2 │ WHERE last_active < DATE_SUB(NOW(), INTERVAL 30 DAY)│   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. DBA Panel (Nav: 👤)

### 7.1 DBA Navigation Panel

```
┌──────────────────────────┐
│ DBA                      │
├──────────────────────────┤
│ 🔍 Search...             │
├──────────────────────────┤
│ ▸ 👤 Users (12)          │
│ ▸ 🎭 Roles (5)           │
│ ▸ 🛡 Privileges           │
│ ▸ 🗄 Databases (3)        │
│ ▸ 📐 Schemas (4)          │  ← PG only
│ ▸ ⚙ Variables             │
│ ▸ 📊 Server Status        │
└──────────────────────────┘
```

### 7.2 User Management Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ 👤 Users                                        [+ Create User]  │
├──────────────────────────────────────────────────────────────────┤
│ 🔍 Filter users...                                               │
├──────────────────────────────────────────────────────────────────┤
│ │ User         │ Host       │ Auth Method │ Locked │ Actions  │  │
│ │──────────────┼────────────┼─────────────┼────────┼──────────│  │
│ │ root         │ localhost  │ sha2        │ No     │ [✏][🗑] │  │
│ │ app_user     │ %          │ sha2        │ No     │ [✏][🗑] │  │
│ │ readonly     │ 10.0.0.%   │ sha2        │ No     │ [✏][🗑] │  │
│ │ backup_user  │ localhost  │ socket      │ Yes    │ [✏][🔓] │  │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ── User Detail (선택 시) ──                                       │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ [General] [Privileges] [Role Membership]                    │  │
│ ├─────────────────────────────────────────────────────────────┤  │
│ │ Username:  app_user                                         │  │
│ │ Host:      %                    ← MySQL only                │  │
│ │ Auth:      caching_sha2_password                            │  │
│ │ Password:  [••••••••] [Change]                              │  │
│ │ Locked:    [ ] Account Locked                               │  │
│ │ Expires:   [          📅]       (optional)                  │  │
│ │                                                             │  │
│ │ Conn Limit: [0 = unlimited]     ← PG only                  │  │
│ │ Superuser:  [ ]                 ← PG only                   │  │
│ │ Can Login:  [✓]                 ← PG only                   │  │
│ │ Inherits:   [✓]                 ← PG only                   │  │
│ └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.3 Privilege Matrix Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ 🛡 Privileges: app_user                           [💾 Apply]     │
├──────────────────────────────────────────────────────────────────┤
│ User: [app_user ▾]   Scope: [Table ▾]   Schema: [public ▾]      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │ Object      │ SELECT │ INSERT │ UPDATE │ DELETE │ ALL │      │
│  │─────────────┼────────┼────────┼────────┼────────┼─────│      │
│  │ users       │  [✓]   │  [✓]   │  [✓]   │  [ ]   │ [ ] │      │
│  │ orders      │  [✓]   │  [✓]   │  [✓]   │  [✓]   │ [ ] │      │
│  │ products    │  [✓]   │  [ ]   │  [ ]   │  [ ]   │ [ ] │      │
│  │ audit_log   │  [ ]   │  [ ]   │  [ ]   │  [ ]   │ [ ] │      │
│  │ ─ All ─     │  [ ]   │  [ ]   │  [ ]   │  [ ]   │ [ ] │      │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Legend: [✓] = Granted  [✓✓] = With Grant Option  [ ] = None    │
│                                                                  │
│  ── Generated SQL Preview ──                                     │
│  GRANT SELECT, INSERT, UPDATE ON public.users TO app_user;       │
│  GRANT ALL ON public.orders TO app_user;                         │
│  REVOKE DELETE ON public.users FROM app_user;                    │
│                                                   [📋 Copy SQL]  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.4 Variables/Parameters Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚙ Server Variables               [Scope: Global ▾] [💾 Apply]   │
├──────────────────────────────────────────────────────────────────┤
│ 🔍 Search variables...       Category: [All ▾]                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │ Variable           │ Value      │ Default │ Context  │        │
│  │────────────────────┼────────────┼─────────┼──────────│        │
│  │ max_connections     │ [150    ]  │ 100     │ 🔄reload │        │
│  │ shared_buffers      │ 256MB      │ 128MB   │ 🔁restart│        │
│  │ work_mem            │ [4MB    ]  │ 4MB     │ ⚡user    │        │
│  │ maintenance_work_mem│ [64MB   ]  │ 64MB    │ ⚡user    │        │
│  │ effective_cache_size│ [4GB    ]  │ 4GB     │ ⚡user    │        │
│  │ log_min_duration_st │ [-1     ]  │ -1      │ 👑super  │        │
│  │────────────────────┼────────────┼─────────┼──────────│        │
│  │ ... (350+ params)  │            │         │          │        │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Context Legend:                                                  │
│  🔁 = Requires restart  🔄 = Requires reload (pg_reload_conf)   │
│  👑 = Superuser session  ⚡ = User session (immediate)            │
│                                                                  │
│  Modified: 2 variables              [Reset All] [💾 Apply]       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Monitor Panel (Nav: 📊)

### 8.1 Monitor Navigation Panel

```
┌──────────────────────────┐
│ MONITOR                  │
├──────────────────────────┤
│ ▸ 🖥 Active Sessions      │
│ ▸ 🔒 Locks                │
│ ▸ 📊 Table Statistics      │
│ ▸ 📈 Index Statistics      │
│ ▸ 🏆 Top SQL               │
│ ▸ 🖧 Server Status         │
│ ▸ 📡 Replication           │  ← 연결 설정에 따라
└──────────────────────────┘
```

### 8.2 Active Sessions Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ 🖥 Active Sessions          [Auto-refresh: 5s ▾] [⏸ Pause]      │
├──────────────────────────────────────────────────────────────────┤
│ Filter: [All ▾]  State: [Active ▾]  User: [All ▾]               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │PID  │User     │DB     │State         │Duration│Wait    │ Act │
│  │─────┼─────────┼───────┼──────────────┼────────┼────────┼─────│
│  │1234 │app_user │mydb   │🟢 active      │ 0.3s   │        │[⏹] │
│  │1235 │app_user │mydb   │🟡 idle in tx  │ 45s    │Lock    │[⏹] │
│  │1236 │admin    │mydb   │🟢 active      │ 2.1s   │IO      │[⏹] │
│  │1237 │readonly │mydb   │⚪ idle         │ 120s   │        │[⏹] │
│  │1238 │backup   │mydb   │🟢 active      │ 5m 23s │        │[⏹] │
│  └────────────────────────────────────────────────────────────── │
│                                                                  │
│  ── Selected Session Detail (PID: 1235) ──                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ User: app_user    Client: 10.0.0.5:52341                  │  │
│  │ Database: mydb    Application: my-api                      │  │
│  │ State: idle in transaction (45s)                           │  │
│  │ Wait: Lock (relation)                                      │  │
│  │ Blocked by: PID 1234                                       │  │
│  │                                                            │  │
│  │ Query:                                                     │  │
│  │ ┌──────────────────────────────────────────────────────┐  │  │
│  │ │ UPDATE orders SET status = 'shipped'                 │  │  │
│  │ │ WHERE order_id = 12345                               │  │  │
│  │ └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │ [🚫 Cancel Query]  [💀 Kill Connection]  [📋 Copy SQL]    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 Table Statistics Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ 📊 Table Statistics                              [↻ Refresh]     │
├──────────────────────────────────────────────────────────────────┤
│ Schema: [public ▾]   Sort by: [Total Size ▾]                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │Table      │Rows(est)│Total   │Data    │Index  │Dead  │ Act   │
│  │───────────┼─────────┼────────┼────────┼───────┼──────┼───────│
│  │orders     │ 1.2M    │ 892MB  │ 640MB  │ 252MB │ 2.3% │[🧹]  │
│  │events     │ 890K    │ 456MB  │ 380MB  │  76MB │ 0.5% │[🧹]  │
│  │users      │  12K    │  4.2MB │  3.1MB │ 1.1MB │ 1.8% │[🧹]  │
│  │products   │   2K    │  1.8MB │  1.2MB │ 0.6MB │ 0.1% │[🧹]  │
│  │sessions   │  45K    │  12MB  │   9MB  │  3MB  │ 8.2% │[🧹⚠]│
│  └────────────────────────────────────────────────────────────── │
│                                                                  │
│  ⚠ sessions: Dead tuple ratio 8.2% exceeds 5% threshold         │
│                                                                  │
│  [🧹 Vacuum Selected]  [📊 Analyze Selected]                    │
└──────────────────────────────────────────────────────────────────┘
```

### 8.4 EXPLAIN Visualizer (쿼리 결과에서 열림)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🌳 Query Plan                    [Format: Tree ▾] [📋 Copy JSON] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Planning Time: 0.234ms    Execution Time: 45.678ms              │
│                                                                  │
│  ┌─ Nested Loop (cost=4.56..123.45 rows=100) ──────────────┐   │
│  │ Actual: rows=98, loops=1, time=42.3ms                     │   │
│  │ Buffers: shared hit=234, read=12                          │   │
│  │                                                           │   │
│  │  ┌─ Index Scan on users_pkey (cost=0.29..8.30) ──────┐  │   │
│  │  │ Actual: rows=1, loops=98, time=2.1ms               │  │   │
│  │  │ Index Cond: (id = orders.user_id)                  │  │   │
│  │  │ Buffers: shared hit=196                            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  ┌─ ⚠ Seq Scan on orders (cost=0.00..35.50) ─────────┐  │   │
│  │  │ Actual: rows=98, loops=1, time=38.5ms  ← SLOW      │  │   │
│  │  │ Filter: (status = 'active')                        │  │   │
│  │  │ Rows Removed by Filter: 902                        │  │   │
│  │  │ Buffers: shared hit=38, read=12                    │  │   │
│  │  │ ⚠ Consider: CREATE INDEX ON orders(status)         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── Estimated vs Actual ──                                       │
│  │ Node           │ Est Rows │ Act Rows │ Ratio │ Status   │    │
│  │────────────────┼──────────┼──────────┼───────┼──────────│    │
│  │ Nested Loop    │ 100      │ 98       │ 0.98  │ ✅ Good  │    │
│  │ Index Scan     │ 1        │ 1        │ 1.00  │ ✅ Good  │    │
│  │ Seq Scan       │ 100      │ 98       │ 0.98  │ ⚠ SeqScan│    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Operations Panel (Nav: 📥)

### 9.1 Data Ops Navigation Panel

```
┌──────────────────────────┐
│ DATA OPS                 │
├──────────────────────────┤
│ 📤 Export Data            │
│ 📥 Import Data            │
│ 💾 SQL Dump               │
│ 📂 Restore                │
└──────────────────────────┘
```

### 9.2 Export Wizard Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ 📤 Export Data                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1 of 3: Select Source                                      │
│  ● ● ○                                                           │
│                                                                  │
│  Source: (●) Table  ( ) Custom Query                             │
│                                                                  │
│  Schema: [public ▾]                                              │
│  Tables: [✓] users                                               │
│          [✓] orders                                              │
│          [ ] products                                            │
│          [ ] sessions                                            │
│                                                                  │
│  ── or ──                                                        │
│  Custom SQL:                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ SELECT * FROM users WHERE created_at > '2026-01-01'      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                                          [Cancel]  [Next →]      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 2 of 3: Format & Options                                   │
│  ○ ● ○                                                           │
│                                                                  │
│  Format: (●) CSV  ( ) JSON  ( ) INSERT SQL  ( ) XLSX            │
│                                                                  │
│  ── CSV Options ──                                               │
│  Delimiter:  [, ▾]   (comma, tab, pipe, semicolon)              │
│  Quote:      [" ▾]                                               │
│  Header:     [✓] Include column headers                          │
│  Encoding:   [UTF-8 ▾]                                          │
│  NULL as:    [NULL    ]                                          │
│  Row limit:  [All ▾]  (All, 100, 1000, 10000, Custom)          │
│                                                                  │
│                                    [← Back]  [Cancel]  [Next →]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 3 of 3: Confirm & Export                                   │
│  ○ ○ ●                                                           │
│                                                                  │
│  Summary:                                                        │
│  • Tables: users, orders                                         │
│  • Format: CSV (comma-delimited, UTF-8)                          │
│  • Estimated rows: ~1,212,450                                    │
│                                                                  │
│  Save to: [~/Downloads/export-2026-03-23/  📁]                   │
│                                                                  │
│  ┌─ Progress ──────────────────────────────────────────────┐    │
│  │ users:   ████████████████████████░░░░░░  80%  9,600/12K│    │
│  │ orders:  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Waiting...    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                                    [← Back]  [Cancel]  [Export]  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 Import Wizard Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ 📥 Import Data                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 2 of 3: Column Mapping                                     │
│  ○ ● ○                                                           │
│                                                                  │
│  File: users_backup.csv (12,450 rows detected)                   │
│  Target Table: [users ▾]   [+ Create New Table]                  │
│                                                                  │
│  ┌─ Column Mapping ─────────────────────────────────────────┐   │
│  │ CSV Column    │  →  │ Table Column │ Type     │ Preview  │   │
│  │───────────────┼─────┼──────────────┼──────────┼──────────│   │
│  │ user_id       │  →  │ [id ▾]       │ int4     │ 1, 2, 3 │   │
│  │ email_address │  →  │ [email ▾]    │ varchar  │ a@b.c   │   │
│  │ full_name     │  →  │ [name ▾]     │ varchar  │ John    │   │
│  │ signup_date   │  →  │ [created ▾]  │ timestmp │ 2026-.. │   │
│  │ phone         │  →  │ [(skip) ▾]   │ -        │ 010-... │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Options:                                                        │
│  On Conflict: (●) Skip  ( ) Update  ( ) Error                   │
│  Batch Size:  [1000 ▾]                                           │
│  Truncate First: [ ] (dangerous)                                 │
│                                                                  │
│  ── Data Preview (first 5 rows) ──                               │
│  │ id │ email      │ name  │ created_at         │                │
│  │────┼────────────┼───────┼────────────────────│                │
│  │ 1  │ a@test.com │ Alice │ 2026-01-15 10:30   │                │
│  │ 2  │ b@test.com │ Bob   │ 2026-01-16 14:22   │                │
│  │ ...                                           │                │
│                                                                  │
│                                    [← Back]  [Cancel]  [Import]  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Bottom Output Panel

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ ⌄ [Results] [Messages] [History]              [Clear] [⌃ Max]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ── Results Tab ──                                               │
│  Full DataGrid (기존 컴포넌트 재사용)                              │
│  + 페이지네이션, 컬럼 토글, Export 버튼                            │
│                                                                  │
│  ── Messages Tab ──                                              │
│  [10:30:15] ✅ Query executed successfully (45ms, 12 rows)       │
│  [10:30:10] ❌ ERROR: relation "users2" does not exist           │
│  [10:29:55] ✅ CREATE INDEX concurrently completed (2.3s)        │
│  [10:29:50] ⚠ WARNING: VACUUM FULL requires exclusive lock       │
│                                                                  │
│  ── History Tab ──                                               │
│  기존 HistoryTab 내용 (간소화 버전, 필터 + 재실행)                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Spec
- Height: 리사이즈 가능 (min: 100px, default: 200px, max: 50vh)
- 상단 드래그 핸들로 높이 조절
- 더블클릭 시 최대화/복원 토글
- `⌄` 버튼: 패널 최소화 (tab bar만 표시)
- `⌃ Max` 버튼: 패널 최대화

---

## 11. Global Search (⌘K)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 Search everything...                                [ESC]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ── Recent ──                                                    │
│  🗂 users                               Table                    │
│  📄 select-active-users                 Query                    │
│                                                                  │
│  ── Tables ──                                                    │
│  🗂 users                               public.users             │
│  🗂 user_sessions                       public.user_sessions     │
│                                                                  │
│  ── Columns ──                                                   │
│  · user_id                              orders.user_id (int4)   │
│  · user_email                           profiles.user_email     │
│                                                                  │
│  ── Functions ──                                                 │
│  ⚡ get_user_by_email(varchar)           public                  │
│                                                                  │
│  ── Queries ──                                                   │
│  📄 user-report                         folder/reports           │
│                                                                  │
│  Press Enter to open · Tab to preview · Esc to close             │
└──────────────────────────────────────────────────────────────────┘
```

### Spec
- 단축키: `⌘K` (Mac) / `Ctrl+K` (Windows)
- Overlay dialog (중앙 상단)
- 실시간 검색 (debounce 200ms)
- 카테고리별 그룹핑: Tables, Views, Functions, Procedures, Triggers, Columns, Queries
- Enter: 선택 항목 열기 (탭으로)
- 최근 항목 우선 표시

---

## 12. Vendor Feature Toggle

### 벤더별 UI 동적 노출

```typescript
// useVendorFeatures.ts
interface VendorFeatures {
  // Objects
  materializedViews: boolean   // PG only
  sequences: boolean           // PG + MariaDB
  events: boolean              // MySQL + MariaDB
  customTypes: boolean         // PG only
  extensions: boolean          // PG only
  domains: boolean             // PG only
  rlsPolicies: boolean         // PG only
  rules: boolean               // PG only

  // DBA
  schemaManagement: boolean    // PG only (2-level)
  hostBasedAuth: boolean       // MySQL/MariaDB (user@host)

  // Triggers
  statementLevelTrigger: boolean  // PG only
  insteadOfTrigger: boolean       // PG only
  triggerDisable: boolean         // PG only
  triggerColumnSpec: boolean      // PG only

  // Functions
  multiLanguage: boolean       // PG only
  functionOverloading: boolean // PG only
  dollarQuoting: boolean       // PG only
  createOrReplace: boolean     // PG + MariaDB

  // Session
  cancelQuery: boolean         // PG only (soft kill)

  // EXPLAIN
  explainBuffers: boolean      // PG only
  explainWal: boolean          // PG only
  explainTree: boolean         // MySQL 8.0.16+
}
```

### 적용 방식
- Object Browser: 벤더에 없는 노드는 렌더링하지 않음
- Editor: 벤더별 옵션 필드 조건부 표시
- Context Menu: 미지원 기능 항목 제거

---

## 13. Shared UI Components (신규)

### 재사용 컴포넌트 목록

| Component | Used In | Description |
|-----------|---------|-------------|
| `CodeEditorModal` | Function, Procedure, Trigger, View | Monaco/CodeMirror 래퍼 + 언어 선택 |
| `ParameterForm` | Function, Procedure | IN/OUT/INOUT 파라미터 CRUD 테이블 |
| `PrivilegeMatrix` | Grants, Default Privileges | 체크박스 그리드 (오브젝트 × 권한) |
| `ObjectDetailLayout` | Table, Sequence, Type, Extension | 헤더 + 서브탭 + 속성 그리드 |
| `StatisticsTable` | Table Stats, Index Stats, Processes | 정렬/필터 가능한 메트릭 테이블 |
| `WizardStepper` | Import, Export, Backup, Restore | 단계별 진행 UI |
| `SqlPreviewPanel` | Grants, DDL, Import | 생성될 SQL 미리보기 (read-only) |
| `PlanTree` | EXPLAIN Visualizer | 실행 계획 트리 노드 시각화 |
| `AutoRefreshControl` | Sessions, Locks, Active Queries | 자동 새로고침 간격 선택 + 일시정지 |
| `ContextMenuBuilder` | Object Browser, All trees | 벤더별 동적 컨텍스트 메뉴 생성 |

---

## 14. Layout Dimensions Summary

### Query 탭 (AS-IS, 변경 없음)
```
┌─ ~250px ──┬─ flex-1 (editor + results) ─┬─ 200px (toggle) ─┐
│ FileTree  │  SQL Editor + Results        │  Schema Panel    │
│ (queries) │                              │  (optional)      │
└───────────┴──────────────────────────────┴──────────────────┘
```

### Console 탭 (신규)
```
┌─ 40px ─┬─ 240px (toggle) ─┬─ flex-1 (main) ──────────────────┐
│        │                   │                                   │
│  Nav   │   Side Panel      │   Multi-Tab Content Area          │
│  Bar   │   (collapsible)   │                                   │
│        │                   │   min-width: 400px                │
│  icons │   Object Browser  ├───────────────────────────────────┤
│  only  │   or DBA Panel    │                                   │
│        │   or Monitor      │   Bottom Output Panel             │
│        │   or Data Ops     │   (resizable, 100~50vh)           │
│        │                   │                                   │
│ 40px   │   240px           │   flex-1                          │
└────────┴───────────────────┴───────────────────────────────────┘

Console minimum width: 40 + 240 + 400 = 680px
Side panel collapsed: 40 + 0 + 400 = 440px
```

---

## 15. Keyboard Shortcuts

### Console 탭 전용 단축키

| Shortcut | Action |
|----------|--------|
| `⌘K` | Global Search (Console 내 오브젝트 검색) |
| `⌘W` | Close current Console tab |
| `⌘S` | Save current editor (Function/Trigger 등) |
| `⌘1~4` | Switch Nav panel (Objects, DBA, Monitor, Data) |
| `⌘B` | Toggle side panel visibility |
| `⌘J` | Toggle bottom output panel |
| `Esc` | Close modal / search |

### Query 탭 기존 단축키 (변경 없음)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Execute query |
| `⌘S` | Save query |

---

## 16. Implementation Plan

> Query 탭은 수정하지 않음. Console은 완전히 새로운 feature로 구현.

### Phase 0: Console 인프라
1. `src/renderer/features/console-browser/` 디렉토리 생성
2. ConsoleBrowserPage 라우팅 추가 (`/db/console/admin`)
3. LiveConsoleLayout에 "Console" 탭 추가
4. consoleBrowserStore (Zustand) — activeNav, openTabs, activeTabId
5. Multi-Tab 시스템 구현 (tabStore: id, type, label, icon, closable, dirty)
6. Nav Bar + Side Panel 토글 구현
7. Bottom Output Panel (결과/메시지)

### Phase 1: Object Browser + CRUD
1. Object Browser 패널 (SchemaPanel 참고하되 신규 구현)
2. Table Detail 탭 (Columns, Constraints, Indexes, Statistics, DDL)
3. Function/Procedure 에디터 탭 (CodeMirror + 파라미터 폼)
4. Trigger 에디터 탭 (PG 2-step workflow / MySQL inline)
5. Sequence Detail 탭
6. Event 에디터 탭 (MySQL/MariaDB)
7. PG 전용: Materialized View, Extension, Type, Domain, Policy

### Phase 2: DBA
1. DBA 패널 (유저/역할/권한 트리)
2. User Management 탭 (CRUD + 상세)
3. Privilege Matrix 탭 (체크박스 그리드)
4. Variable/Parameter 뷰어 탭 (검색/필터/인라인 편집)
5. Database/Schema 관리

### Phase 3: Monitor
1. Monitor 패널 (세션/통계 바로가기)
2. Active Sessions 탭 (자동 새로고침 + Kill)
3. EXPLAIN Visualizer 탭 (JSON → 트리)
4. Table/Index Statistics 탭
5. Lock Monitoring 탭
6. Server Status 탭

### Phase 4: Data Ops + Utility
1. Data Ops 패널
2. Export Wizard (CSV/JSON/SQL, 3-step)
3. Import Wizard (파일 업로드 + 컬럼 매핑)
4. SQL Dump/Restore (CLI wrapper)
5. Global Search (⌘K)

### Query 탭 연동 (Phase 1에서 함께)
- CrossTabAction 이벤트 버스 구현
- "View Data" → Query 탭 전환 + SQL 실행
- "Script as CREATE" → Query 탭 전환 + DDL 삽입
