# Spring Integration Test Template (JUnit 5 + Spring Boot)

```java
@SpringBootTest
@AutoConfigureMockMvc
class {Resource}IntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void shouldCreateResource() throws Exception {
    mockMvc.perform(post("/api/{resource}")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"test\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data.name").value("test"));
  }
}
```
