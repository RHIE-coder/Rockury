# MVP Project Structure (Electron/Vite)

## Overview
Electron 프로젝트의 기본 모듈 경계

```
src/
  main/      # Electron main process
  renderer/  # UI (renderer)
  preload/   # preload scripts
```

## Notes
- main/renderer/preload 간 의존성 경계 유지
- 플랫폼별 코드 분리 필요 시 `platform/` 하위 사용
