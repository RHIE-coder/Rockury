# Scenario Workflow

## Overview
프롬프트 기반 개발 시나리오를 통합 오케스트레이션으로 수행

---

## 1. Prompt → Planning
### @planner
- 요구사항 분석
- Feature Spec 작성
- Acceptance Checklist 생성

**Outputs**
- `templates/spec/feature-spec.md`
- `templates/spec/acceptance-checklist.md`

---

## 2. Design
### @frontend / @backend / @dba
- 아키텍처/모듈 분해
- 데이터 모델/스키마 설계
- 위험 요소/의존성 분석

---

## 3. Development + Tests
### @frontend / @backend
- 프로파일 규칙에 따라 구현
- 테스트 코드 동시 작성

### @qa
- 테스트 플랜 작성
- 커버리지 기준 확인

**Outputs**
- `templates/qa/test-plan.md`

---

## 4. Automation Gates
- Core 게이트 순서 실행
- 실제 명령은 프로파일/플러그인에서 주입

---

## 5. DEV Deployment & Verification
### @devops
- DEV 배포
- E2E/API/DB/보안 검사
- 개선점/버그 수정 반복

---

## 6. STG Deployment & Approval
### @devops / @qa
- STG 배포
- 안정화 검증
- 릴리스 승인

---

## 7. Documentation
### @planner / @qa
- 구조/학습자료/현황 문서 업데이트

**Outputs**
- `templates/docs/architecture.md`
- `templates/docs/learning-pack.md`
- `templates/docs/status-report.md`
