# Feature Development Workflow (Tech-Agnostic)

## Overview
새로운 기능 개발 시 따르는 표준 워크플로우

---

## 1. Planning Phase

### @planner Agent
```
1. 요구사항 분석
   - 기능 목적 정의
   - 사용자 스토리 작성
   - 성공 기준 정의

2. 기술적 분석
   - 영향 범위 파악
   - 의존성 확인
   - 위험 요소 식별

3. 작업 분해
   - Task 목록 생성
   - 우선순위 결정
   - 담당 Agent 할당
```

### Output
```markdown
## Feature: [기능명]

### User Story
As a [사용자 유형],
I want to [기능],
So that [목적].

### Acceptance Criteria
- [ ] 조건 1
- [ ] 조건 2
- [ ] 조건 3

### Technical Approach
- [접근 방식 설명]

### Tasks
1. @backend: API/도메인 설계 및 구현
2. @frontend: UI 컴포넌트 구현
3. @qa: 테스트 작성
```

---

## 2. Design Phase

### Backend (@backend)
```
1. API/도메인 모델 설계
   - Request/Response 스키마
   - 에러 케이스

2. 데이터 모델/스키마 설계
   - 마이그레이션 도구/ORM(프로파일 기준)
   - 관계 정의
   - 인덱스 설계

3. 서비스 로직 설계
   - 비즈니스 규칙
   - 트랜잭션 경계
   - 외부 서비스 연동
```

### Frontend (@frontend)
```
1. UI/UX 설계
   - 와이어프레임
   - 컴포넌트 구조
   - 상태 관리 전략

2. API 연동 계획
   - 데이터 패칭 전략(프로파일 기준)
   - 에러/로딩 처리

3. 접근성 고려
   - ARIA 속성
   - 키보드 네비게이션
```

---

## 3. Implementation Phase

### Git Branch
```bash
# Feature branch 생성
git checkout -b feature/[feature-name]
```

### Backend Implementation
```
1. 스키마 작성
2. 마이그레이션 적용
3. 검증 스키마 정의
4. Service 레이어 구현
5. Controller 구현
6. Router 연결
```

### Frontend Implementation
```
1. 타입 정의
2. API 서비스 작성
3. 데이터 패칭 훅 구현
4. UI 컴포넌트 구현
5. 상태 연결
6. 스타일링
```

---

## 4. Testing Phase

### @qa Agent
```
1. Unit Tests
   - Service 테스트
   - Utility 테스트
   - Hook 테스트

2. Integration Tests
   - API 엔드포인트 테스트

3. Component Tests
   - 컴포넌트 렌더링
   - 사용자 인터랙션

4. E2E Tests (Critical Path)
   - Happy path
   - Error scenarios
```

### Coverage Requirements
```
- 신규 코드: 90%+
- 전체: 80%+ 유지
```

---

## 5. Review Phase

### Self Review
```
- [ ] 코드 품질 체크리스트 통과
- [ ] 테스트 커버리지 충족
- [ ] 보안 체크리스트 확인
- [ ] 문서 업데이트
```

### Pull Request
```markdown
## Summary
[기능 설명]

## Changes
- [변경 사항 1]
- [변경 사항 2]

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] E2E tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Security review completed
```

---

## 6. Merge & Deploy

### Merge Strategy
```bash
# Squash merge to main

git checkout main
git merge --squash feature/[feature-name]
git commit -m "feat: [feature description]"
git push
```

### Post-Merge
```
1. CI/CD 파이프라인 확인
2. 스테이징 환경 테스트
3. 프로덕션 배포 (수동/자동)
4. 모니터링 확인
```
