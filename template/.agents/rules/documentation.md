# Documentation Rules (Tech-Agnostic)

## Overview
코드/설계/운영 전 과정의 문서화 표준

---

## Code Documentation

### Required
- Public API
- 비즈니스 규칙/정책 로직
- 복잡한 알고리즘
- 구성 옵션

### Optional
- 자명한 getter/setter
- 단순한 glue 코드

---

## README Structure
```markdown
# Project Name

간단한 프로젝트 설명 (1-2문장)

## Features
- 주요 기능 1
- 주요 기능 2

## Quick Start
- 설치/실행 방법

## Tech Stack
- 프로파일에서 정의된 스택 링크

## Project Structure
- 주요 폴더 설명

## Scripts
- 주요 명령어

## Contributing
- 개발 프로세스
```

---

## ADR (Architecture Decision Records)
```markdown
# ADR-001: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
결정이 필요한 배경 설명

## Decision
채택한 결정 내용

## Consequences
- 장점
- 단점

## Alternatives
- 검토한 대안
```

---

## Changelog
```markdown
# Changelog

## [Unreleased]
### Added
### Changed
### Fixed
### Security
```

---

## Documentation Outputs
- `docs/architecture.md`: 구조/모듈/흐름
- `docs/learning-pack.md`: 학습 자료
- `docs/status-report.md`: 개발 현황/체크리스트
