# Pre-Commit Hook (Tech-Agnostic)

## Overview
커밋 전 자동 검증 게이트

---

## Policy
- Core 게이트 순서 준수
- 실제 명령은 프로파일/플러그인에서 주입

---

## Example (Placeholder)
```bash
# profile/plugin에서 제공되는 명령
# lint
# type-check
# format-check
```

---

## Checklist
- [ ] Lint 통과
- [ ] Type check 통과 (해당 시)
- [ ] Formatting 확인
- [ ] 시크릿 노출 없음
