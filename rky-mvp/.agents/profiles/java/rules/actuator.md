# Actuator Standard (Spring Boot)

## Required Endpoints
- `/actuator/health`
- `/actuator/metrics`
- `/actuator/info`

## Security
- 외부 노출은 최소화
- 민감한 엔드포인트는 내부망 또는 인증 필요

## Example Configuration
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```
