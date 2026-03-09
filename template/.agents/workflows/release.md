# Release Workflow (Tech-Agnostic)

## Overview
새 버전 릴리스 시 따르는 표준 워크플로우

---

## Version Strategy

### Semantic Versioning
```
MAJOR.MINOR.PATCH

MAJOR: 호환성 깨지는 변경
MINOR: 새 기능 (하위 호환)
PATCH: 버그 수정
```

---

## 1. Pre-Release Checklist

### Code Freeze
```
- [ ] develop 브랜치에 모든 기능 머지 완료
- [ ] 알려진 Critical 버그 수정 완료
- [ ] 코드 프리즈 선언
```

### Quality Assurance (@qa)
```
- [ ] 전체 테스트 스위트 통과
- [ ] E2E 테스트 통과
- [ ] 성능 테스트 완료
- [ ] 보안 스캔 완료
- [ ] 회귀 테스트 완료
```

### Documentation
```
- [ ] CHANGELOG 업데이트
- [ ] API 문서 업데이트
- [ ] 마이그레이션 가이드 (breaking changes)
- [ ] 릴리스 노트 초안
```

---

## 2. Release Branch

### Create Release Branch
```bash
# Release branch 생성
git checkout develop
git pull origin develop
git checkout -b release/v[VERSION]
```

### Version Bump
- 버전 업데이트 방식은 **프로파일** 기준

---

## 3. Release Testing

### Staging Deployment
- 배포 명령은 **프로파일/플러그인** 기준

### Final Testing (@qa)
```
1. Smoke Test
2. Regression Test
3. Performance Test
4. Security Check
```

---

## 4. Release Approval

### Sign-Off Checklist
```markdown
## Release v[VERSION] Approval

### Technical
- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Security scan clean
- [ ] Documentation complete

### Business
- [ ] Product owner approval
- [ ] Stakeholder notification

### Operations
- [ ] Rollback plan ready
- [ ] Monitoring dashboards ready
```

---

## 5. Production Release

### Merge to Main
```bash
# Release branch를 main에 머지
git checkout main
git pull origin main
git merge release/v[VERSION] --no-ff
git push origin main
```

### Create Tag
```bash
# 태그 생성
git tag -a v[VERSION] -m "Release v[VERSION]"
git push origin v[VERSION]
```

### Backport to Develop
```bash
git checkout develop
git merge main
git push origin develop
```

---

## 6. Deployment

### @devops Agent
- 프로파일/플러그인 기반 배포 스크립트 사용
- Blue-Green/Rolling 등 전략 선택

---

## 7. Post-Release

### Verification
```
- [ ] 프로덕션 동작 확인
- [ ] 에러 로그 모니터링
- [ ] 메트릭 대시보드 확인
```

### Monitoring Period
```
- 첫 1시간: 집중 모니터링
- 첫 24시간: 주기적 확인
- 첫 1주일: 일일 리뷰
```

---

## Rollback Procedure

### When to Rollback
```
- Critical 버그 발견
- 심각한 성능 저하
- 보안 취약점 발견
- 데이터 손실 가능성
```

### Rollback Steps
- 이전 버전 배포 절차는 **프로파일/플러그인** 기준
