# Spring Controller Template

```java
@RestController
@RequestMapping("/api/{resource}")
public class {Resource}Controller {
  private final {Resource}Service service;

  public {Resource}Controller({Resource}Service service) {
    this.service = service;
  }

  @GetMapping("/{id}")
  public ResponseEntity<{Resource}Response> getById(@PathVariable Long id) {
    return ResponseEntity.ok(service.getById(id));
  }

  @PostMapping
  public ResponseEntity<{Resource}Response> create(@RequestBody {Resource}Request request) {
    return ResponseEntity.ok(service.create(request));
  }
}
```
