# Pre-Push Hook (Tech-Agnostic)

## Overview
원격 저장소 push 전 자동 검증 게이트

---

## Policy
- Automation 게이트 순서 준수
- 실제 명령은 프로파일/플러그인에서 주입

---

## Example (Placeholder)
```bash
# profile/plugin에서 제공되는 명령
# test:ci
# coverage
# build
```

---

## Checklist
- [ ] Unit/Integration 테스트 통과
- [ ] Coverage 기준 충족
- [ ] Build 성공
- [ ] E2E (가능 시)
