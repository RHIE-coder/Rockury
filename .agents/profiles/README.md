# Profiles

## 목적
프로파일은 특정 언어/프레임워크/스택에 대한 규칙, 템플릿, 명령을 정의한다.

## 구조
```
profiles/
  <profile-name>/
    profile.md
    rules/
    templates/
    checklists/
```

## 원칙
- 코어는 기술-중립 유지
- 구체적 빌드/테스트/디렉토리 구조는 프로파일로 분리
- 자동화 명령은 플러그인과 연결 가능
