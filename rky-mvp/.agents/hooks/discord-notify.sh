#!/bin/bash
# Discord notification hook for Claude Code
# Sends prompt start / task completion messages via webhook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

# Load .env
if [ ! -f "$ENV_FILE" ]; then
  exit 0
fi
DISCORD_WEBHOOK_URL=$(grep -E '^DISCORD_WEBHOOK_URL=' "$ENV_FILE" | cut -d'=' -f2-)
if [ -z "$DISCORD_WEBHOOK_URL" ] || [[ "$DISCORD_WEBHOOK_URL" == *"YOUR_WEBHOOK"* ]]; then
  exit 0
fi

# Read hook input from stdin
INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')

# Truncate long text for Discord embed (max 4096 chars)
truncate_text() {
  local text="$1"
  local max="${2:-1500}"
  if [ "${#text}" -gt "$max" ]; then
    echo "${text:0:$max}..."
  else
    echo "$text"
  fi
}

# Escape text for JSON string
json_escape() {
  local text="$1"
  text="${text//\\/\\\\}"
  text="${text//\"/\\\"}"
  text="${text//$'\n'/\\n}"
  text="${text//$'\r'/}"
  text="${text//$'\t'/\\t}"
  echo "$text"
}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
STARTFILE="/tmp/.claude-discord-start-$$"

case "$EVENT" in
  UserPromptSubmit)
    PROMPT=$(echo "$INPUT" | jq -r '.prompt // "(empty)"')
    PROMPT_ESCAPED=$(json_escape "$(truncate_text "$PROMPT")")

    # Save start time for duration calculation
    date +%s > "$PROJECT_DIR/.claude/.discord-start-time"

    curl -sf -X POST "$DISCORD_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"embeds\": [{
          \"title\": \"🚀 Task Started\",
          \"description\": \"\`\`\`\\n${PROMPT_ESCAPED}\\n\`\`\`\",
          \"color\": 3447003,
          \"footer\": {\"text\": \"Rockury MVP\"},
          \"timestamp\": \"$TIMESTAMP\"
        }]
      }" > /dev/null 2>&1 &
    ;;

  Stop)
    DURATION_TEXT="unknown"
    START_TIME_FILE="$PROJECT_DIR/.claude/.discord-start-time"
    if [ -f "$START_TIME_FILE" ]; then
      START_TS=$(cat "$START_TIME_FILE")
      NOW_TS=$(date +%s)
      ELAPSED=$((NOW_TS - START_TS))

      if [ "$ELAPSED" -ge 3600 ]; then
        H=$((ELAPSED / 3600))
        M=$(( (ELAPSED % 3600) / 60 ))
        S=$((ELAPSED % 60))
        DURATION_TEXT="${H}h ${M}m ${S}s"
      elif [ "$ELAPSED" -ge 60 ]; then
        M=$((ELAPSED / 60))
        S=$((ELAPSED % 60))
        DURATION_TEXT="${M}m ${S}s"
      else
        DURATION_TEXT="${ELAPSED}s"
      fi
      rm -f "$START_TIME_FILE"
    fi

    curl -sf -X POST "$DISCORD_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"embeds\": [{
          \"title\": \"✅ Task Completed\",
          \"fields\": [
            {\"name\": \"Duration\", \"value\": \"${DURATION_TEXT}\", \"inline\": true}
          ],
          \"color\": 3066993,
          \"footer\": {\"text\": \"Rockury MVP\"},
          \"timestamp\": \"$TIMESTAMP\"
        }]
      }" > /dev/null 2>&1 &
    ;;
esac

exit 0
