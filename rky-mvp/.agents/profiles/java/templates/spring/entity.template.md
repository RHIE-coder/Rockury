# Spring Entity Template

```java
@Entity
@Table(name = "{resource}")
public class {Resource} {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  protected {Resource}() {}

  public {Resource}(String name) {
    this.name = name;
  }

  public Long getId() { return id; }
  public String getName() { return name; }
}
```
