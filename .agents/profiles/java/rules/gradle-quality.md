# Gradle Quality Configuration (Spring Boot)

## Checkstyle (example)
```gradle
checkstyle {
  toolVersion = '10.12.4'
  configFile = file("config/checkstyle/checkstyle.xml")
}

tasks.withType(Checkstyle).configureEach {
  reports {
    xml.required = true
    html.required = true
  }
}
```

## JaCoCo (example)
```gradle
jacoco {
  toolVersion = "0.8.11"
}

jacocoTestReport {
  reports {
    xml.required = true
    html.required = true
  }
}

jacocoTestCoverageVerification {
  violationRules {
    rule {
      limit {
        minimum = 0.80
      }
    }
  }
}

test.finalizedBy jacocoTestReport
```
