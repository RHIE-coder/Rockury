# Plugins

## 목적
플러그인은 자동화/도구 연동을 위한 실행 가능한 단위입니다.

## 구조 예시
```
plugins/
  registry.json
  <plugin-name>/
    plugin.md
    scripts/
```

## 원칙
- 코어는 플러그인 존재만 가정
- 실제 명령/도구 연결은 플러그인에서 정의
