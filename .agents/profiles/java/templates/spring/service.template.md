# Spring Service Template

```java
@Service
public class {Resource}Service {
  private final {Resource}Repository repository;

  public {Resource}Service({Resource}Repository repository) {
    this.repository = repository;
  }

  public {Resource}Response getById(Long id) {
    {Resource} entity = repository.findById(id)
      .orElseThrow(() -> new NotFoundException("{resource} not found"));
    return {Resource}Mapper.toResponse(entity);
  }

  public {Resource}Response create({Resource}Request request) {
    {Resource} entity = {Resource}Mapper.toEntity(request);
    return {Resource}Mapper.toResponse(repository.save(entity));
  }
}
```
