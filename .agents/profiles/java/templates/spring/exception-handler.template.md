# Spring Exception Handler Template

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    List<String> details = ex.getBindingResult()
      .getFieldErrors()
      .stream()
      .map(err -> err.getField() + ": " + err.getDefaultMessage())
      .toList();

    return ResponseEntity.badRequest().body(
      new ErrorResponse("VALIDATION_ERROR", "Validation failed", details)
    );
  }

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
      .body(new ErrorResponse("NOT_FOUND", ex.getMessage(), List.of()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(new ErrorResponse("INTERNAL_ERROR", "Unexpected error", List.of()));
  }
}
```
