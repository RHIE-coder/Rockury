# Vibe Coding Framework Base Configuration

## Project Context

**프로젝트명**: RKY-MVP (Framework Validation)
**목적**: 바이브 코딩 프레임워크로 고품질 소프트웨어를 일관되게 설계/구현/검증/문서화

### 핵심 원칙
1. **구조화된 코드**: Top-Down 설계, 명확한 모듈 경계
2. **결정적 코드**: 예측 가능하고 테스트 가능한 로직
3. **컨텍스트 효율성**: 최소 정보로 최대 결과, 문서/템플릿 기반 진행
4. **품질 우선**: 테스트와 검증 게이트를 통한 지속 품질 유지
5. **보안 내재화**: 설계 단계부터 보안/취약점 고려
6. **문서 우선**: 구조/지식/현황을 지속적으로 기록

---

## Scope Model

### Core (기술-중립)
- 프로세스, 품질 기준, 보안 체크리스트, 문서화 규칙
- 자동화 게이트 정의(구체 명령은 프로파일/플러그인에서 주입)

### Profiles (기술-특화)
- 언어/프레임워크/스택별 규칙과 템플릿
- 빌드/테스트/디렉토리 구조 등 구현 상세

### Plugins (실행/도구 연동)
- CI, 테스트 러너, 스키마 검증, 배포 도구 등 실행형 연결

---

## Quality Targets

### Coverage Targets (기본 기준)
- 핵심 비즈니스 로직: 90%+
- 전체: 80–90% 유지

### Quality Gates (정의만, 실행은 프로파일/플러그인)
- Lint → TypeCheck → Unit → Integration → E2E → Coverage → Build

---

## Security Principles
- 입력 검증 필수
- 최소 권한 원칙
- 민감 정보 로그 금지
- 배포 전 보안 점검

---

## Agent System

### Core Agents
| Agent | 역할 | 활성화 |
|-------|------|--------|
| planner | 기획, 아키텍처, 의사결정 | 항상 |
| frontend | UI/UX, 클라이언트 로직 | 항상 |
| backend | 서버, API, 비즈니스 로직 | 항상 |
| devops | CI/CD, 인프라, 배포 | 항상 |
| qa | 테스트, 품질 보증 | 항상 |

### Specialist Agents
| Agent | 역할 | 활성화 |
|-------|------|--------|
| security | 보안 분석, 취약점 점검 | 필요시 |
| dba | DB 설계/성능 최적화 | 필요시 |
| ai-ops | AI/ML 파이프라인, LLMOps | 필요시 |

### Agent 호출 방법
```
"@security 이 API의 보안 취약점을 분석해주세요"
"@dba 이 쿼리의 성능을 최적화해주세요"
"@ai-ops LLM 파이프라인을 설계해주세요"
```

---

## Development Workflow (Core)

### Feature Development
```
1. planner: 요구사항 분석, 설계
2. frontend/backend: 구현
3. qa: 테스트 작성 및 실행
4. devops: 배포 준비
5. 리뷰 및 문서화 업데이트
```

### Bug Fix
```
1. qa: 재현/분석
2. frontend/backend: 수정
3. qa: 회귀 테스트
4. devops: 핫픽스 배포
```

---

## File References

- Personas: `.agents/personas/`
- Rules: `.agents/rules/`
- Profiles: `.agents/profiles/`
- Plugins: `.agents/plugins/`
- Templates: `.agents/templates/`
- Hooks: `.agents/hooks/`
- Workflows: `.agents/workflows/`
- MCP: `.agents/mcp/`
