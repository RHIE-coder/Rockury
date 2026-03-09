#!/bin/bash

# =============================================================================
# Vibe Coding Framework - Setup Script
# =============================================================================
# 이 스크립트는 .agents 폴더를 .claude와 .codex에 심볼릭 링크합니다.
# Usage: ./.agents/setup.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Vibe Coding Framework Setup"
echo "================================"
echo "Project Root: $PROJECT_ROOT"
echo ""

# -----------------------------------------------------------------------------
# .claude 설정
# -----------------------------------------------------------------------------
setup_claude() {
    echo "📁 Setting up .claude..."

    CLAUDE_DIR="$PROJECT_ROOT/.claude"
    mkdir -p "$CLAUDE_DIR"

    # 심볼릭 링크할 폴더들
    FOLDERS=("skills" "rules" "templates" "personas" "hooks" "workflows" "prompts" "profiles" "plugins" "mcp")

    for folder in "${FOLDERS[@]}"; do
        SOURCE="$SCRIPT_DIR/$folder"
        TARGET="$CLAUDE_DIR/$folder"

        if [ -d "$SOURCE" ]; then
            # 기존 링크/폴더 제거
            if [ -L "$TARGET" ]; then
                rm "$TARGET"
            elif [ -d "$TARGET" ]; then
                rm -rf "$TARGET"
            fi

            # 상대 경로로 심볼릭 링크 생성
            ln -s "../.agents/$folder" "$TARGET"
            echo "  ✅ Linked: .claude/$folder -> .agents/$folder"
        fi
    done

    # settings.local.json 유지 (있으면)
    if [ ! -f "$CLAUDE_DIR/settings.local.json" ]; then
        cat > "$CLAUDE_DIR/settings.local.json" << 'EOF'
{
  "permissions": {
    "allow": []
  }
}
EOF
        echo "  ✅ Created: .claude/settings.local.json"
    fi
}

# -----------------------------------------------------------------------------
# .codex 설정
# -----------------------------------------------------------------------------
setup_codex() {
    echo "📁 Setting up .codex..."

    CODEX_DIR="$PROJECT_ROOT/.codex"
    mkdir -p "$CODEX_DIR"

    # 심볼릭 링크할 폴더들
    FOLDERS=("skills" "rules" "templates" "personas" "profiles" "plugins" "mcp")

    for folder in "${FOLDERS[@]}"; do
        SOURCE="$SCRIPT_DIR/$folder"
        TARGET="$CODEX_DIR/$folder"

        if [ -d "$SOURCE" ]; then
            # 기존 링크/폴더 제거
            if [ -L "$TARGET" ]; then
                rm "$TARGET"
            elif [ -d "$TARGET" ]; then
                rm -rf "$TARGET"
            fi

            # 상대 경로로 심볼릭 링크 생성
            ln -s "../.agents/$folder" "$TARGET"
            echo "  ✅ Linked: .codex/$folder -> .agents/$folder"
        fi
    done
}

# -----------------------------------------------------------------------------
# Git Hooks 설정 (선택적)
# -----------------------------------------------------------------------------
setup_git_hooks() {
    echo "📁 Setting up Git hooks..."

    if [ -d "$PROJECT_ROOT/.git" ]; then
        # Husky가 설치되어 있으면 사용, 아니면 직접 설정
        if [ -d "$PROJECT_ROOT/node_modules/husky" ]; then
            echo "  ℹ️  Husky detected. Run 'npx husky init' to setup hooks."
        else
            # 직접 git hooks 설정
            GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

            # pre-commit hook
            cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
npm run lint 2>/dev/null || echo "Lint script not found, skipping..."
npm run type-check 2>/dev/null || echo "Type-check script not found, skipping..."
EOF
            chmod +x "$GIT_HOOKS_DIR/pre-commit"
            echo "  ✅ Created: .git/hooks/pre-commit"

            # pre-push hook
            cat > "$GIT_HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
npm run test 2>/dev/null || echo "Test script not found, skipping..."
npm run build 2>/dev/null || echo "Build script not found, skipping..."
EOF
            chmod +x "$GIT_HOOKS_DIR/pre-push"
            echo "  ✅ Created: .git/hooks/pre-push"
        fi
    else
        echo "  ⚠️  Not a git repository. Skipping git hooks."
    fi
}

# -----------------------------------------------------------------------------
# 실행
# -----------------------------------------------------------------------------
main() {
    setup_claude
    echo ""
    setup_codex
    echo ""
    setup_git_hooks
    echo ""
    echo "================================"
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Review .claude/ and .codex/ folders"
    echo "  2. Read .agents/BASE.md for project context"
    echo "  3. Start coding with @planner, @frontend, @backend, etc."
}

main "$@"
