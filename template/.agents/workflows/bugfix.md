# Bugfix Workflow (Tech-Agnostic)

## Overview
버그 수정 시 따르는 표준 워크플로우

---

## 1. Bug Triage

### Information Gathering
```markdown
## Bug Report

### Description
[버그 설명]

### Steps to Reproduce
1. [단계 1]
2. [단계 2]
3. [단계 3]

### Expected Behavior
[예상 동작]

### Actual Behavior
[실제 동작]

### Environment
- OS: [운영체제]
- Version: [앱 버전]

### Severity
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low
```

---

## 2. Investigation

### @qa Agent
- 재현
- 로그/메트릭 확인
- 원인 분석

---

## 3. Fix Implementation

### Git Branch
```bash
# Bugfix branch 생성
git checkout -b fix/[bug-description]

# Hotfix (Critical bugs)
git checkout -b hotfix/[bug-description]
```

### Implementation Steps
- 문제 코드 식별
- 수정 구현
- 버그 재현 테스트 추가

---

## 4. Verification

### @qa Agent
```
- [ ] 버그 재현 테스트 통과
- [ ] 기존 테스트 통과
- [ ] 회귀 테스트 통과
- [ ] 수동 테스트 완료
- [ ] 엣지 케이스 확인
```

---

## 5. Pull Request

### PR Template for Bugfix
```markdown
## Bug Fix

### Issue
Fixes #[이슈 번호]

### Root Cause
[원인 설명]

### Solution
[해결 방법 설명]

### Changes
- [변경 사항 1]
- [변경 사항 2]

### Testing
- [ ] Bug reproduction test added
- [ ] All existing tests pass
- [ ] Manual verification completed

### Regression Risk
[회귀 위험도: Low/Medium/High]
```

---

## 6. Deployment
- 배포/핫픽스 절차는 **프로파일/플러그인** 기준

---

## 7. Post-Fix

### Documentation
```markdown
### Bug Post-Mortem

#### Summary
[버그 요약]

#### Root Cause
[원인 상세]

#### Resolution
[해결 방법]

#### Prevention
- [재발 방지 대책 1]
- [재발 방지 대책 2]
```
