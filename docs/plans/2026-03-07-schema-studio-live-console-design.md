# Design: Schema Studio & Live Console

> Brainstorming session: 2026-03-07
> Status: Draft (approved concepts, pre-implementation)

---

## 1. Overview

Rockury MVP의 DB Tool 영역을 **4개 영역**으로 재구조화한다.

| 영역 | 정체성 | 데이터 소스 |
|------|--------|-----------|
| **Schema Studio** | 설계를 조작하는 공간 (Read-Write) | 로컬 저장소 |
| **Live Console** | 현실을 관찰하고 탐색하는 공간 | Real DB (Connection) |
| **Package** | 교차 도메인 오케스트레이터 (환경별 대시보드) | Schema Studio + Live Console 연결 |
| **Overview** | 전체 리소스 관계도 및 현황판 | 모든 리소스 메타데이터 |

### 동기

- 설계(Virtual)와 운영(Real)의 관심사를 UI 수준에서 명확히 분리
- Virtual/Real Diagram이 같은 탭에 섞여 있는 현재 구조의 혼란 해소
- 데이터 브라우저, Seed 캡처 등 새 기능을 수용할 구조 필요
- "DB 설계 도구"에서 "DB 개발 워크벤치"로 확장

---

## 2. Navigation Structure

```
+------+------------------------------------------------------------+
|      | [Overview | Package | Schema Studio | Live Console]         |
|      |------------------------------------------------------------|
|      | [Tab A] [Tab B] [Tab C] ...                  <-- 뷰 탭     |
|  DB  |---------+--------------------------------------------------|
|      |         |                                                  |
|      | Context |              Main Content                        |
|      | Panel   |                                                  |
|      |(탭 종속) |                                                  |
|      |         |                                                  |
+------+---------+--------------------------------------------------+
```

순서 원칙: 추상도 높은 것(전체 파악)에서 구체적인 것(실제 작업) 순서.

### 2.1 Dynamic Context Panel (좌측 패널)

좌측 패널은 고정이 아니라, **선택한 뷰 탭에 종속되어 동적으로 내용이 바뀐다.**

#### Schema Studio

| 뷰 탭 | 좌측 Context Panel |
|-------|-------------------|
| Diagram | 없음 또는 미니맵 |
| DDL | Object Tree (전체 설계 객체) |
| Seed | Seed File 목록 |
| Mocking | Mocking Profile 목록 |
| Documenting | 문서 목록 |
| Validation | Rule/Suite 목록 |

#### Live Console

| 뷰 탭 | 좌측 Context Panel |
|-------|-------------------|
| Connection | Connection 목록 (CRUD) |
| Diagram | 없음 또는 미니맵 |
| Data | Object Tree (Tables, Views) |
| SQL(정의) | Object Tree (전체) |
| Explorer | 실행 히스토리 또는 없음 |
| Query Collection | 저장된 쿼리 목록 |
| Seed | Seed File 목록 |
| Validation Run | Run 결과 목록 |

#### Package

| 뷰 탭 | 좌측 Context Panel |
|-------|-------------------|
| Dashboard | Package 목록 |

#### Overview

| 뷰 탭 | 좌측 Context Panel |
|-------|-------------------|
| Graph | 필터/검색 패널 |
| List | 필터/검색 패널 |

---

## 3. Schema Objects

### 3.1 카테고리 분류

```
Schema Objects
+-- Core
|   +-- Tables
|   +-- Views
|   +-- Materialized Views  (PG only)
|   +-- Indexes
|
+-- Routines (Stored Programs)
|   +-- Procedures
|   +-- Functions
|   +-- Triggers
|   +-- Events              (MySQL/MariaDB only)
|
+-- Definitions
    +-- Types               (PG only)
    +-- Sequences           (PG only)
```

Operators(PG custom)는 MVP에서 제외. Dialect 구조상 나중에 추가 가능.

### 3.2 벤더별 지원 범위

| 객체 | MySQL/MariaDB | PostgreSQL |
|------|:---:|:---:|
| Tables | O | O |
| Views | O | O |
| Materialized Views | X | O |
| Functions | O (Routines) | O |
| Procedures | O | O (v11+) |
| Types | X | O (ENUM, Composite) |
| Sequences | X (AUTO_INCREMENT) | O |
| Indexes | O | O |
| Triggers | O | O |
| Events | O | X (pg_cron 확장) |

### 3.3 Dialect 추상화

벤더별 차이를 `IDialect` 인터페이스로 추상화한다.

```
IDialect
+-- MySQLDialect
+-- MariaDBDialect
+-- PostgreSQLDialect

각 Dialect가 제공하는 것:
- supportedObjects: 지원하는 객체 타입 목록 (확장 가능)
- introspect(conn): 각 객체 타입별 메타데이터 조회 쿼리
- generateDdl(object): 객체의 DDL 생성
```

Connection의 `dbType`에 따라 Object Tree에 해당 카테고리만 표시한다.
새로운 객체 타입(예: Operators)은 Dialect에 추가만 하면 자동으로 지원된다.

---

## 4. Schema Studio

설계를 조작하는 공간. 실행 기능은 없다 (모든 교차 도메인 액션은 Package에서).

### 4.1 뷰 탭 목록

| 뷰 탭 | 역할 |
|-------|------|
| **Diagram** | 스키마 설계 ERD (편집 가능: 드래그, 관계 연결, 테이블/컬럼 CRUD) |
| **DDL** | 전체 객체의 DDL 편집 (Tables, Views, Routines, Types...) + 버전 관리 |
| **Seed** | Seed DML 관리/편집 + 직접 작성. 서비스 구동에 필수적인 초기화/설정 데이터 |
| **Mocking** | 환경별 Mocking Profile 관리. 개발/테스트용 더미 데이터 생성 전략 정의 |
| **Documenting** | DB 구조 자동 문서 생성 + Markdown 편집 + Export (Markdown, PDF, 이미지) |
| **Validation** | 검증 규칙 정의 (Validation Suite / Validation Rule / Check) |

### 4.2 Seed vs Mocking

| | Seed | Mocking |
|--|------|---------|
| 목적 | 서비스 구동 필수 데이터 | 개발/테스트용 더미 데이터 |
| 예시 | Member Roles, Setting Options | 1000명 가상 유저, 5000건 주문 |
| 환경 | 모든 환경에 동일하게 적용 | 환경별 Profile이 다름 |
| 데이터 소스 | Live Console에서 캡처 + 직접 작성 | 스키마 기반 자동 생성 |

Mocking Profile과 환경별 전략:

| 환경 | Seed | Mocking 전략 |
|------|:---:|-------------|
| Local | 적용 | 대량 (자유롭게, 극단 케이스 포함) |
| Dev | 적용 | 중간 (팀 공유, 일관된 테스트셋) |
| QA/Stage | 적용 | 프로덕션 유사 (현실적 데이터 패턴) |
| Production | 적용 | 절대 적용 안 함 (차단) |

### 4.3 Version (통합 버전 관리)

한 Version = DB의 전체 상태 정의. 모든 객체를 하나로 묶어 관리한다.

```
Version v3
+-- Schema (Tables, Views, Indexes, Types, Sequences, MV)
+-- Routines (Procedures, Functions, Triggers, Events)
+-- Seed (INSERT DMLs)
+-- Mocking (Profile 정의)
+-- Documenting (설계 문서)
+-- Validation (검증 규칙)
```

이유: 스키마가 바뀌면 Seed, Routines, 문서, 검증 규칙도 영향을 받는다. 유기적 관계가 있는 객체들을 별도로 버전 관리하면 조합 불일치가 발생한다.

### 4.4 Validation 명세

Schema Studio에서는 **무엇을 검증할지 정의**만 한다. 실행은 Package를 통해 Live Console에서.

```
Validation Suite: "v3 배포 전 검증"
+-- [Schema] users 테이블에 email 컬럼 존재하는가
+-- [Schema] orders.status는 VARCHAR(50)인가
+-- [Data]   roles 테이블에 'admin' 행이 존재하는가
+-- [Data]   settings 테이블에 필수 설정값 3개 있는가
+-- [Query]  SELECT COUNT(*) FROM users -> 0 이상인가
+-- [FK]     orders.user_id -> users.id 참조 무결성
```

정의 방식:
- SQL 직접 작성 (자유도 높은 검증)
- UI에서 조건 선택 (쉬운 검증)
- 두 가지 모두 지원

용어 정리:
- **Validation Suite**: 검증 규칙의 그룹 (예: "v3 배포 전 검증")
- **Validation Rule**: 개별 검증 항목
- **Check**: Rule 내의 구체적 조건/assertion

### 4.5 공유 컴포넌트

Live Console과 동일한 Entity를 다루므로 UI 컴포넌트를 재사용한다.

```
shared/
+-- ObjectTree        (mode: 'readonly' | 'editable')
+-- DiagramCanvas     (mode: 'readonly' | 'editable')
+-- DdlViewer         (mode: 'readonly' | 'editable')
+-- SeedEditor        (mode: 'capture' | 'manage')
+-- SqlRunner         (mode: 'explorer' | 'collection')
```

---

## 5. Live Console

현실을 관찰하고 탐색하는 공간. 단일 도메인 DB 조작(Explorer, Query Collection)만 가능.
교차 도메인 액션(Forward, Reverse, Validation Run 등)은 Package에서만 실행.

### 5.1 뷰 탭 목록

| 뷰 탭 | 역할 |
|-------|------|
| **Connection** | DB 연결 CRUD, 테스트, 상태 모니터링 |
| **Diagram** | Real DB 스키마를 ERD로 시각화 (읽기 전용) |
| **Data** | 테이블별 데이터 조회 + Pagination |
| **SQL(정의)** | 선택한 객체의 DDL/본문 조회 (읽기 전용) |
| **Explorer** | 자유 SQL 실행 (임시, 일회성) |
| **Query Collection** | 저장된 SQL을 SwaggerUI 스타일로 관리/실행 |
| **Seed** | 데이터 행 선택 -> INSERT DML 캡처 |
| **Validation Run** | Package에서 트리거된 검증 실행 결과 표시 |

### 5.2 Connection & Sync

- Connection 객체를 통해 Real DB 연결을 위한 DataSource 관리
- Sync 버튼으로 DB 내용을 전체 가져와 반영
- **Ignore 설정**: Connection 단위로 무시할 테이블/객체 설정
  - 개별 객체 무시: `alembic_version`, `log_events`
  - 패턴 기반 무시: `log_*`, `_backup_*`
  - 무시된 객체는 숨김 처리 (토글로 확인 가능)
  - Diagram, Snapshot, Diff에서 제외됨

### 5.3 객체별 탭 매핑

| 객체 타입 | Diagram | Data | SQL(정의) | Seed |
|----------|:---:|:---:|:---:|:---:|
| Table | O (ERD 노드) | O (행 조회) | O (CREATE TABLE) | O (캡처) |
| View | O (점선 노드) | O (결과 조회) | O (CREATE VIEW) | X |
| Materialized View | O (점선 노드) | O (결과 조회) | O (CREATE MV) | X |
| Function | X | X | O (함수 본문) | X |
| Procedure | X | X | O (프로시저 본문) | X |
| Trigger | X | X | O (트리거 본문) | X |
| Type | X | X | O (타입 정의) | X |
| Sequence | X | O (현재값) | O (CREATE SEQUENCE) | X |
| Index | O (테이블 내) | X | O (CREATE INDEX) | X |
| Event | X | X | O (스케줄 + 본문) | X |

### 5.4 Query Safety Level

SQL 실행 시 쿼리 위험도에 따라 제어한다.

| Level | 대상 | 동작 |
|-------|------|------|
| Safe (Green) | SELECT, SHOW, DESCRIBE, EXPLAIN | 즉시 실행 |
| Caution (Yellow) | INSERT, UPDATE | 확인 팝업 + 영향 행수 미리보기 |
| Destructive (Red) | DELETE, DROP, TRUNCATE, ALTER | 이중 확인 + 자동 Snapshot 제안 |

Connection별 권한 모드:

| 모드 | 허용 | 용도 |
|------|------|------|
| Read Only | SELECT 계열만 | 운영 DB 안전 조회 |
| Cautious | 전부 허용, 위험 쿼리는 확인 필요 | 개발 DB |
| Full Access | 전부 즉시 실행 | 로컬 DB |

### 5.5 Explorer vs Query Collection

| | Explorer | Query Collection |
|--|---------|-----------------|
| 용도 | 임시로 빠르게 실행 | 저장해두고 반복 실행 |
| 저장 | 안 함 (일회성) | 이름 + Description 포함 저장 |
| UI | 터미널 느낌 | SwaggerUI 느낌 (목록 -> 클릭 -> 결과) |
| Syntax 체크 | 기본 | 벤더별 Syntax 체크 |

### 5.6 Seed 캡처

Data 탭에서 행을 체크박스로 선택 -> INSERT DML 생성 -> Schema Studio의 Seed로 저장.

- FK 의존 순서 자동 정렬 (제약조건 기반)
- 캡처 옵션:
  - 기존 Seed File에 추가
  - 기존 Seed File 덮어쓰기
  - 새 Seed File 생성

---

## 6. Snapshot

### 6.1 정의

Snapshot = 특정 시점의 Real DB 상태 캡처.

포함 내용:
- 전체 스키마 구조 (Tables, Views, Routines, Types, Sequences, Indexes, Triggers, Events)
- Seed 데이터 (캡처된 INSERT DML)
- Ignore된 객체는 **제외**

### 6.2 상태 모델

| 상태 | 의미 | 표시 |
|------|------|------|
| Fresh (Green) | 방금 Sync, DB와 일치 확인됨 | `Synced just now` |
| Stale (Yellow) | 시간이 지남, 일치 여부 불명 | `Synced 2 days ago` |
| Drifted (Red) | Sync 결과 변경 감지됨 | `3 changes detected` |
| Archived (Gray) | 의도적으로 보관된 이전 버전 | `v2 Archive` |

### 6.3 역할

- Diff의 **비교 기준점** (Schema Studio 설계 vs Snapshot)
- Rollback의 **복원 지점** (Forward 실패 시)
- Schema Evolution의 **상태 기록**

---

## 7. Drift Detection

### 7.1 2단계 체크

| 체크 타입 | 비용 | 내용 | 최소 간격 | 기본값 |
|----------|------|------|----------|-------|
| Lightweight | 낮음 (~10ms) | 스키마 해시만 비교 (테이블 수 + 이름 목록) | 5초 | 30초 |
| Full | 높음 | 전체 스키마 상세 조회, Snapshot과 상세 Diff | 60초 | 300초 |

Lightweight Check에서 변경 감지 시 Full Check를 자동 트리거한다.

### 7.2 트리거 모드

| 모드 | 동작 |
|------|------|
| 주기적 자동 (Lightweight) | 설정한 간격으로 자동 실행 |
| 주기적 자동 (Full) | 설정한 간격으로 자동 실행 (0=끔) |
| 수동 Sync | 사용자가 Sync 버튼 클릭 시 |
| Pre-Action | Forward, Snapshot 생성 등 중요 작업 전 강제 실행 |

### 7.3 설정

```
Drift Detection Settings
  Auto Check          [On]
  +-- Light Check 주기  [ 30 ] 초  (최소 5초)
  +-- Full Check 주기   [ 300 ] 초  (최소 60초, 0=끔)
  +-- Pre-Action Check  [On]

  * Light Check 10초 미만 설정 시 경고:
    "운영 DB 연결 시 부하가 발생할 수 있습니다"
```

### 7.4 Schema Evolution (변경 이력)

Drift Detection에 이력 누적 기능을 통합한다. 별도 History 기능은 두지 않는다.

기록 방식: **쿼리 기반이 아닌 변경 포인트 기반**

```
+----------------------------------------------+
| 2026-03-07 14:30  [Drift Detected]           |
|                                              |
| 변경 사항:                                    |
|  + users.age (INT, NULL)     컬럼 추가        |
|  ~ orders.status             VARCHAR(20->50) |
|  - products.legacy_code      컬럼 삭제        |
|                                              |
| 상응 DDL:                                     |
|  ALTER TABLE users ADD COLUMN age INT NULL;   |
|  ALTER TABLE orders MODIFY status VARCHAR(50);|
|  ALTER TABLE products DROP COLUMN legacy_code;|
|                                              |
| Snapshot: #12 -> #13                         |
+----------------------------------------------+
```

실제 실행된 쿼리와 일치하지 않을 수 있지만, 결과가 동일한 상응 DDL을 생성하여 보여준다.

---

## 8. Package (Orchestrator)

Schema Studio(설계)와 Live Console(현실)을 연결하는 교차 도메인 오케스트레이터.
**모든 교차 도메인 액션은 Package에서만 실행한다.**

### 8.1 역할

```
Package = 환경별 "설계 대비 현실" 상태 대시보드 + 액션 실행

환경 공통 (Schema Studio)         환경 종속 (Live Console)
  Diagram/DDL                      Connection
  Seed                             Mocking Profile
  Validation Suite                 Snapshot
  Documenting
```

### 8.2 Package 구조

```
Package: DEV
+-- 연결 설정 --------------------------+
|  Design Version: v3 (Schema Studio)   |
|  Connection: dev-mysql                |
|  Mocking Profile: dev-profile         |
+---------------------------------------+
|  현재 상태:                            |
|  Gap: v2 -> v3 (Migration 필요)       |
|    + payments 테이블 생성              |
|    + orders.payment_id 추가           |
|    ~ users.status VARCHAR(20->50)     |
|                                       |
|  Seed:       Applied (v2) -> 업데이트 필요 |
|  Validation: Last Run 3/6 Passed      |
|  Mocking:    Applied (dev-profile)    |
+---------------------------------------+
|  Actions:                             |
|  [Forward] [Reverse] [Validation Run] |
|  [Seed 적용] [Mocking 실행]           |
+---------------------------------------+
```

### 8.3 기능 배치 원칙: 한 곳에만 존재

| 액션 | 위치 | 이유 |
|------|------|------|
| Forward | Package만 | Schema Studio + Connection 양쪽 필요 |
| Reverse | Package만 | Connection + Schema Studio 양쪽 필요 |
| Validation Run | Package만 | Validation 규칙 + Connection 양쪽 필요 |
| Seed 적용 | Package만 | Seed 데이터 + Connection 양쪽 필요 |
| Mocking 실행 | Package만 | Mocking Profile + Connection 양쪽 필요 |
| Explorer SQL 실행 | Live Console만 | Connection만 필요 |
| Query Collection 실행 | Live Console만 | Connection만 필요 |
| Diagram 편집 | Schema Studio만 | 설계 영역 |
| Snapshot/Sync | Live Console만 | Connection 직접 조작 |
| Drift Detection | Live Console만 | Connection 직접 모니터링 |

편의를 위해 각 영역에서 Package로의 **바로가기**를 제공한다:
- Schema Studio에서 설계 완료 후: [Forward 하러 가기] -> Package로 전환
- Live Console에서 Drift 감지 후: [Reverse 하러 가기] -> Package로 전환

### 8.4 사용 시나리오

**"DEV DB에 최신 설계 반영"**
1. Package: DEV 열기
2. Gap 확인: v2 -> v3, 변경 3건
3. [Forward] 클릭 -> Diff 리뷰 -> Validation -> 실행
4. [Seed 적용] -> [Mocking 실행]

**"QA 환경 처음부터 셋업"**
1. Package: QA 열기
2. [Forward] -> 설계 전체 반영
3. [Seed 적용] -> 필수 데이터
4. [Mocking 실행] -> QA용 테스트 데이터

**"운영 DB 변경을 설계에 반영"**
1. Package: PROD 열기
2. Gap에 Drift 표시: "외부 변경 2건 감지"
3. [Reverse] -> 새 Snapshot -> 설계 v4로 반영

**"배포 전 QA 검증"**
1. Package: QA 열기
2. [Validation Run] -> 6/6 통과 확인
3. PROD Forward 진행

---

## 9. Overview (Dashboard)

전체 리소스 관계도 및 현황판. 두 가지 활용 방식으로 제공.

### 9.1 공통 팝업 (Impact Map)

어떤 영역에서든 리소스 수정/삭제 시 **자동으로 팝업**되어 영향 범위를 보여준다.

```
Connection: dev-mysql 수정 시

Impact Map:
+-- dev-mysql (수정 대상)
    +-- Package: DEV
    |   +-- Snapshot #12 (이 Connection 기반)
    |   +-- Mocking Profile: dev-profile
    +-- Package: DEV-Legacy
    |   +-- Snapshot #8
    +-- Live Console
        +-- Drift Detection (이 Connection 감시 중)
        +-- Query Collection: 3개 쿼리가 이 Connection 사용
```

- 수정/삭제 전에 자동으로 표시 (확인 없이 진행 불가)
- 역방향 추적: 이 리소스를 누가 참조하고 있는가
- 영향 범위의 심각도 표시: 단순 참조 vs 깨지는 의존성

### 9.2 Graph 뷰

React Flow 기반 전체 리소스 관계 그래프.

노드 타입:

| 노드 | 형태 | 내용 |
|------|------|------|
| Connection | 파랑 | 이름, 상태, dbType |
| Package | 초록 | 이름, 연결 현황 |
| Design Version | 보라 | v3, 포함 객체 수 |
| Snapshot | 노랑 | #12, 상태(Fresh/Stale/Drifted) |
| Seed File | 문서 아이콘 | 이름, 대상 테이블 |
| Mocking Profile | 기어 아이콘 | 이름, 대상 환경 |
| Validation Suite | 체크 아이콘 | 이름, 마지막 결과 |

인터랙션:

| 동작 | 결과 |
|------|------|
| 노드 클릭 | 상세 정보 패널 |
| 노드 hover | 연결된 노드 하이라이트, 나머지 dim |
| 노드 우클릭 | 해당 영역으로 이동, 편집, 삭제 등 |
| 엣지(연결선) | 관계 유형 표시 (소속, 참조, 의존) |

### 9.3 List 뷰

테이블 형태 현황판.

```
| Resource       | Type       | Used By        | Status   |
|----------------|------------|----------------|----------|
| dev-mysql      | Connection | DEV, DEV-Legacy| Online   |
| qa-mysql       | Connection | QA             | Online   |
| prod-mysql     | Connection | PROD           | Online   |
| v3             | Design     | DEV, QA, PROD  | Latest   |
| init-roles.sql | Seed       | v3             | 5 tables |
| dev-profile    | Mocking    | DEV            | 1000행   |
| v3 검증        | Validation | DEV, QA, PROD  | 3/6 Pass |
```

---

## 10. Interactions

### 10.1 Reverse (Live Console -> Schema Studio, via Package)

현재 Real DB 상태를 설계의 출발점으로 가져온다.

```
Live Console                     Schema Studio
+----------+                    +--------------+
| Snapshot | --- Reverse -----> | 새 Version   |
| #5       |   (via Package)   | (Snapshot 기반)|
|          |                    |              |
| Tables   | ----------------> | Tables       |
| Views    | ----------------> | Views        |
| Routines | ----------------> | Routines     |
| Seed     | ----------------> | Seed         |
|(무시 제외) |                   |              |
+----------+                    +--------------+
```

Snapshot 기반 + Connection 종속 Ignore 필터 적용.

기존 설계 버전이 있는 경우 사용자가 선택:
- 새 버전 생성 (기존 유지, Snapshot 기반 새 버전 추가)
- 덮어쓰기 (현재 작업 중인 버전을 Snapshot으로 교체)

### 10.2 Forward (Schema Studio -> Live Console, via Package)

설계를 Real DB에 반영한다.

```
1. Schema Studio 설계 (v3) vs Snapshot (현재 상태) Diff 비교
                |
2. Migration DDL 생성
                |
3. Validation 실행 (Precondition)
   - 통과 -> 계속
   - 실패 -> 중단, 수정 필요
                |
4. Drift Check (강제)
   - Drift 없음 -> 안전 진행
   - Drift 있음 -> 경고, 새 Snapshot 제안
                |
5. 리뷰 화면 (DDL 미리보기 + 영향 범위)
                |
6. Step-by-step 실행
   - 하나씩 차근차근 실행 가능
   - 매 Statement마다 Checksum 검증 (외부 변경 감지)
   - 문제 시 사용자 판단: [계속] [중단] [롤백]
                |
7. 성공 시 새 Snapshot 자동 생성
```

#### Forward 동시 제어 (Concurrent Modification Safety)

외부에서 동시에 DB를 변경하는 경우에 대한 안전장치:

**Step 1 - 실행 전: Lock 선언**
- Advisory Lock 획득 (다른 Rockury 인스턴스 차단)
- 현재 스키마 Checksum 저장
- Pre-Snapshot 자동 생성

**Step 2 - 실행 중: 매 Statement마다 검증**
- 각 DDL 실행 후 Checksum 재확인
- 외부 변경 감지 시 사용자에게 판단 위임: [계속 진행] [여기서 중단] [롤백]

**Step 3 - 실패/중단 시: 상태 기록**
- 부분 적용 상태를 명확히 기록 (N/M applied)
- Pre-Snapshot으로 롤백 가능
- 나머지 실행 재개 가능

벤더별 DDL 트랜잭션 차이:

| 벤더 | DDL 트랜잭션 | 영향 |
|------|:---:|------|
| PostgreSQL | 지원 | DDL을 하나의 트랜잭션으로 묶을 수 있음 |
| MySQL/MariaDB | 불가 | DDL마다 암묵적 COMMIT, 부분 롤백 불가 |

핵심 원칙: 완벽한 자동 해결은 불가능. 정확한 상황 인지 + 사용자 판단 지원을 제공한다.

### 10.3 Seed Capture (Live Console -> Schema Studio)

```
Live Console (Data 탭)           Schema Studio (Seed 탭)
+- users 테이블 -+               +- Seed File: "init-roles" -+
| [v] id=1 admin |  Capture -->  | INSERT INTO users ...      |
| [v] id=2 user  |               | INSERT INTO users ...      |
| [ ] id=3 guest |               |                            |
+----------------+               +----------------------------+
```

캡처 옵션:
- 기존 Seed File에 추가 / 덮어쓰기 / 새 Seed File 생성
- FK 의존 순서 자동 정렬

### 10.4 Validation (Schema Studio -> Live Console, via Package)

```
Schema Studio (명세)                 Package (트리거)         Live Console (실행)
+-- Validation Suite          -->   [Validation Run]   -->  +-- Validation Run
    +-- Validation Rule                                         +-- Validation Result
    +-- Check                                                   +-- Pass/Fail
```

### 10.5 UI 전환

| 구현 순서 | 방식 | 난이도 |
|----------|------|--------|
| 1차 | 영역 전환 (상단 토글, 각 영역 상태 유지) | 낮음 |
| 2차 | 플로팅 패널 (다른 영역 기능을 떠다니는 패널로) | 중간 |
| 3차 | 화면 분할 (좌우/상하 분할) | 높음 |

---

## 11. Interaction Summary

```
Schema Studio          Package              Live Console
(설계/명세)            (오케스트레이터)       (관찰/실행)
+--------------+      +---------------+     +----------------+
|              |      |               |     |                |
|  Diagram     |      |  Forward  ----------> Connection     |
|  DDL         | <-----  Reverse     |     |  Snapshot      |
|  Seed   <----|------ Seed Capture  | <---|  Data          |
|  Mocking     |      |  Mocking Run -----> |  Explorer      |
|  Documenting |      |  Val. Run   ------> |  Val. Result   |
|  Validation  |      |               |     |  Query Coll.   |
|  Version     |      |  Dashboard    |     |  Diagram       |
|              |      |  Impact Map   |     |  Drift Det.    |
+--------------+      +---------------+     +----------------+
                             |
                       +-----+-----+
                       |  Overview  |
                       |  (Graph/   |
                       |   List)    |
                       +-----------+
```

---

## 12. Migration from Current Structure

현재 구현된 기능들의 재배치:

| 현재 위치 | 이동 대상 | 비고 |
|----------|----------|------|
| Virtual Diagram | Schema Studio > Diagram | 편집 가능 ERD |
| Real Diagram | Live Console > Diagram | 읽기 전용 ERD |
| DDL Editor + Version | Schema Studio > DDL | 버전 관리 확장 (통합 버전) |
| Diff / Migration Pack | Package > Forward | 오케스트레이션으로 통합 |
| Connection | Live Console > Connection | 위치 변경 |
| Package | Package 영역 (독립) | 오케스트레이터로 승격 |
| Query Execution | Live Console > Explorer + Query Collection | 분리 |
| Schema Snapshot | Live Console > Snapshot | 개념 확장 (Seed 포함) |
| Changelog | Live Console > Drift Detection | Schema Evolution으로 통합 |
| Validation | Schema Studio (명세) + Live Console (실행) via Package | 분리 |
| Documenting | Schema Studio > Documenting | 설계 문서 |
| Mocking | Schema Studio > Mocking | 환경별 Profile, Package에서 실행 |
