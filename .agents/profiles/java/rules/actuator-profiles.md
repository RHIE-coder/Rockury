# Actuator Exposure by Profile

## Local
- expose: health,info,metrics,env,loggers

## DEV
- expose: health,info,metrics

## STG
- expose: health,info,metrics

## PROD
- expose: health,info

## Example Configuration
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```
