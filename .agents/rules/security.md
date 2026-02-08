# Security Rules (Tech-Agnostic)

## Overview
개발 전 과정에서 적용되는 보안 규칙 및 체크리스트

---

## Input Validation
- 모든 외부 입력은 **명시적 스키마**로 검증
- 유효성 실패 시 표준 오류 응답

---

## Injection Prevention
- 파라미터 바인딩/Prepared Statement 사용
- 문자열 연결 기반 쿼리 금지

---

## XSS / Output Encoding
- 모든 출력은 기본 이스케이프
- Raw HTML 렌더링 시 sanitize 필수
- CSP 정책 적용 권장

---

## Authentication & Session
- 자격 증명은 안전 저장(해시)
- 세션/토큰은 보안 옵션 적용
- 토큰 만료/회전 정책 명시

---

## Authorization
- 최소 권한 원칙 적용
- 권한 체크는 중앙화

---

## API Security
- Rate limit
- 요청 크기 제한
- CORS 정책 명시

---

## Secrets Management
- 시크릿은 환경 변수/시크릿 매니저 사용
- 리포지토리에 하드코딩 금지

---

## Logging
- 민감 정보 마스킹
- 에러 메시지에 내부 정보 노출 금지

---

## Security Checklist

### Pre-Commit
- [ ] 하드코딩된 시크릿 없음
- [ ] 민감 정보 로그 없음

### Code Review
- [ ] Injection 취약점 없음
- [ ] XSS 방지 적용
- [ ] 인증/인가 체크 정상

### Deployment
- [ ] 환경 변수 설정 확인
- [ ] HTTPS 적용
- [ ] Rate limiting 적용

### Periodic Audit
- [ ] 의존성 취약점 점검
- [ ] 주요 정책 재검토
