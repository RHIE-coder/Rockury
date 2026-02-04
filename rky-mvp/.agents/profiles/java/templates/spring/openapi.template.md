# OpenAPI Template (Spring Boot)

```yaml
openapi: 3.0.3
info:
  title: Sample API
  version: 0.1.0
  description: API description
servers:
  - url: http://localhost:8080
paths:
  /api/{resource}:
    get:
      summary: Get resource
      responses:
        '200':
          description: Success
components:
  schemas:
    Resource:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
```
