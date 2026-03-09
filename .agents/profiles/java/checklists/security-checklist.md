# Spring Boot Security Checklist

## Input/Validation
- [ ] Bean Validation 적용(@Valid)
- [ ] 입력 길이/형식 제한

## Auth/AuthZ
- [ ] 인증 없는 접근 차단
- [ ] 권한 상승 시도 차단
- [ ] 관리자 기능 접근 제어

## Injection
- [ ] SQL Injection 방지 (JPA parameter binding)
- [ ] Command Injection 방지

## XSS/CSRF
- [ ] 출력 인코딩 적용
- [ ] CSRF 보호 설정

## Secrets/Logging
- [ ] 시크릿 환경 변수 관리
- [ ] 민감 정보 로그 금지
