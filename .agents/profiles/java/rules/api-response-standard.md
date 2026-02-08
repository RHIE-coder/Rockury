# API Response Standard (Spring Boot)

## Success Response
```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

## Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["field: message"]
  },
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

## Notes
- `requestId`는 로깅/트레이싱 연동을 위해 포함
- `details`는 필드 오류/검증 결과
