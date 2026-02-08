# Testing Rules (Tech-Agnostic)

## Overview
테스트 작성 가이드라인 및 커버리지 목표

---

## Coverage Target: 80–90%

### Required Coverage (90%+)
| 대상 | 최소 커버리지 | 이유 |
|------|---------------|------|
| Core services / domain logic | 90% | 비즈니스 핵심 |
| Validation / policy logic | 90% | 안정성 확보 |
| Utilities | 90% | 재사용 로직 |

### Recommended Coverage (70–80%)
| 대상 | 최소 커버리지 | 이유 |
|------|---------------|------|
| UI components | 70% | 시각 로직 중심 |
| State management | 75% | 복잡도 중간 |

### Optional Coverage (50%+)
| 대상 | 최소 커버리지 | 이유 |
|------|---------------|------|
| Config / wiring | 50% | 변경 빈도 낮음 |
| Types / schemas only | N/A | 런타임 없음 |

---

## Test Types
- **Unit Tests**: 함수/클래스 단위
- **Integration Tests**: 모듈/레이어 간 결합
- **E2E Tests**: 사용자 시나리오

---

## Naming Convention
- `{name}.test` (Unit)
- `{name}.int` (Integration)
- `{name}.e2e` (E2E)

---

## AAA Pattern
- **Arrange**: 데이터/환경 준비
- **Act**: 대상 실행
- **Assert**: 결과 검증

---

## Mocking Guidelines
- 외부 의존성은 Mock/Stub 처리
- 테스트 대상 자체는 Mock 금지
- 시간/네트워크/파일 I/O는 테스트 전용 대체

---

## E2E Scope
- Critical path 중심
- 실패/경계 조건 포함
- 배포 환경(DEV/STG)에서 실행 가능하도록 설계
