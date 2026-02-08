# Spring Error Response Template

```java
public record ErrorResponse(
  String code,
  String message,
  List<String> details
) {}
```
