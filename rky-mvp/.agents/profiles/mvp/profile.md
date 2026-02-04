# MVP Profile

## Overview
현재 MVP 프로젝트 기준 스택 정의 (프레임워크 검증용)

---

## Stack
- **Runtime**: Electron
- **Bundler**: Vite
- **Language**: TypeScript
- **Build**: Electron Forge
- **Lint**: ESLint
- **Test (추천)**: Vitest (unit/integration), Playwright (e2e)

---

## Project Characteristics
- 데스크톱 앱 (Electron)
- 모듈 경계는 `main` / `renderer` / `preload` 기준
- 빌드/패키징은 Electron Forge 기준

---

## Commands (현재 package.json 기준)
- `npm run start`
- `npm run package`
- `npm run make`
- `npm run publish`
- `npm run lint`

---

## Notes
- 테스트 도입 시, 게이트 명령은 프로파일 `rules/` 또는 플러그인에 정의
