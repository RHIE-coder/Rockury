# Git Commit Convention

## 목적
에이전트에게 커밋을 요청할 때 참고할 표준 규칙을 제공한다.

Trigger: 사용자가 "git commit 해줘"라고 말하면 이 문서를 기준으로 커밋 처리한다.

---

## 커밋 메시지 포맷
```
<type>(<scope>): <subject>

<body>

<footer>
```

---

## Type
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- refactor: 리팩토링
- test: 테스트 추가/수정
- chore: 기타 변경
- build: 빌드/패키징
- ci: CI 설정

---

## Scope
프로젝트 도메인 또는 변경 영역을 짧게 표기
예: core, mvp, java, docs, ci, build, test, chore

---

## Subject Rules
- 72자 이하
- 동사 원형 사용
- 마침표 금지

---

## Body Rules
- 변경 이유/영향/주의점을 간결히 서술
- 필요 시 bullet 사용

---

## Footer Rules
- 이슈 링크, breaking change, refs 등

---

## Agent 요청 템플릿
아래 형식으로 커밋을 요청한다.

```markdown
# Commit Request
- type:
- scope:
- subject:
- body:
  -
- footer:
- files:
  -
- tests: (run or not run + reason)

요청:
1) 위 정보를 바탕으로 컨벤션 맞춘 커밋 메시지 생성
2) 변경 요약 작성
3) git commit 실행
```
