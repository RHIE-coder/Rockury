# Observability Rules (Spring Boot)

## Logging
- 구조화 로그(JSON) 권장
- 요청 단위 `requestId` 포함
- 민감 정보 로그 금지

## Tracing
- OpenTelemetry 기반 트레이싱 권장
- HTTP 요청/DB 호출 트레이스 연동

## Metrics
- 기본 메트릭: 요청 수, 응답 시간, 에러율
- JVM 메트릭: heap, GC, thread

## Recommendations
- Spring Boot Actuator 활성화
- 중앙 로그 수집 (예: ELK, Loki)
