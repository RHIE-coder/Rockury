# API Response & Error Mapping

## Standard Mapping
- 성공 응답: `api-response-standard.md` 형식 적용
- 오류 응답: `error-response.template.md` 사용

## Controller Advice
- Global Exception Handler는 모든 에러를 표준 포맷으로 매핑

## Example
```java
return ResponseEntity.ok(
  Map.of("data", result, "meta", meta)
);
```
