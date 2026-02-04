# Spring Service Test Template (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class {Resource}ServiceTest {
  @Mock
  private {Resource}Repository repository;

  @InjectMocks
  private {Resource}Service service;

  @Test
  void shouldReturnEntityWhenFound() {
    {Resource} entity = new {Resource}("name");
    when(repository.findById(1L)).thenReturn(Optional.of(entity));

    {Resource}Response result = service.getById(1L);

    assertThat(result.name()).isEqualTo("name");
  }
}
```
