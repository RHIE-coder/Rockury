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

## 7. Documentation & Learning
### @documentor
- 코드 변경 분석 및 문서 자동 갱신
- 아키텍처 문서 생성/업데이트
- API 문서 생성
- CHANGELOG 갱신

**Prompts**
- `prompts/auto-document.md`

**Outputs**
- `docs/architecture.md`
- `docs/api.md`
- `CHANGELOG.md`

---

## 8. Learning Materials
### @educator
- 기술 스택 분석 및 학습 우선순위 결정
- 핵심 기술별 학습 가이드 생성
- 온보딩 문서 생성
- 개념 설명 및 패턴 문서화

**Prompts**
- `prompts/generate-learning.md`

**Outputs**
- `docs/learning/tech-guides/` (기술별 학습 가이드)
- `docs/learning/onboarding.md` (온보딩 가이드)
- `docs/learning/patterns.md` (패턴 설명)
- `docs/learning/faq.md` (FAQ)

---

## 9. Status Report
### @planner / @qa
- 개발 현황 및 체크리스트 업데이트
- 완료된 작업 정리
- 다음 단계 계획

**Outputs**
- `docs/status-report.md`
