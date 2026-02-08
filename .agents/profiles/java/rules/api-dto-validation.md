# API/DTO/Validation Rules (Spring Boot)

## Controller Rules
- Controller는 요청/응답 매핑만 담당
- 비즈니스 로직은 Service로 이동
- 예외는 공통 Error Handler로 전파

## DTO Rules
- Request/Response DTO 분리
- 엔티티를 직접 노출하지 않음
- 필드 검증은 DTO에서 수행

## Validation Rules
- `@Valid` + `jakarta.validation` 어노테이션 사용
- 검증 실패 시 표준 에러 포맷으로 응답

## Example
```java
public record CreateUserRequest(
  @NotBlank String name,
  @Email String email
) {}

@PostMapping
public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
  return ResponseEntity.ok(service.create(request));
}
```
