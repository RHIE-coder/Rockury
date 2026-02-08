# Automation Gates (Tech-Agnostic)

## Overview
품질 보증을 위한 공통 자동화 게이트 정의

---

## Gate Order
1. Lint
2. TypeCheck (typed languages only)
3. Unit Tests
4. Integration Tests
5. E2E Tests
6. Coverage
7. Build

---

## Gate Policies
- **Block**: Lint, TypeCheck, Unit, Integration, Coverage, Build
- **Warn**: E2E (환경 준비 여부에 따라)

---

## Command Resolution
- 실제 명령은 **프로파일/플러그인**이 제공
- 코어는 게이트 순서와 정책만 정의

---

## Output Artifacts
- 테스트 리포트
- 커버리지 리포트
- 빌드 산출물

---

## Example Mappings

### Java (Spring Boot + Gradle)
- Lint: `./gradlew checkstyleMain checkstyleTest`
- Unit: `./gradlew test`
- Coverage: `./gradlew test jacocoTestReport`
- Build: `./gradlew build`

### JS/TS (Jest)
- Unit: `npm run test`
- Coverage: `npm run test:coverage`
