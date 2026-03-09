# Spring Boot Gradle Template

```gradle
plugins {
  id 'java'
  id 'org.springframework.boot' version '3.3.0'
  id 'io.spring.dependency-management' version '1.1.5'
  id 'jacoco'
  id 'checkstyle'
}

group = 'com.example'
version = '0.1.0'

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(17)
  }
}

repositories {
  mavenCentral()
}

dependencies {
  implementation 'org.springframework.boot:spring-boot-starter-web'
  implementation 'org.springframework.boot:spring-boot-starter-validation'

  testImplementation 'org.springframework.boot:spring-boot-starter-test'
  testImplementation 'org.mockito:mockito-core:5.12.0'
}

test {
  useJUnitPlatform()
}

jacocoTestReport {
  reports {
    xml.required = true
    html.required = true
  }
}

checkstyle {
  toolVersion = '10.12.4'
}
```
