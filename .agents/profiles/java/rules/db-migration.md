# DB Migration Rules (Spring Boot + Flyway)

## Recommended Tool
- Flyway

## Rules
- 모든 스키마 변경은 마이그레이션으로 관리
- 마이그레이션은 **순서 보장** 및 **롤백 전략** 고려
- 프로덕션 반영 전 DEV/STG 검증 필수

## Naming Convention
```
V<version>__<description>.sql
# 예: V1__init_schema.sql
```

## Example Configuration
```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
```
