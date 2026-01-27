#!/usr/bin/env bash
set -euo pipefail

# Color definitions
if [ -t 1 ]; then
  BLACK="\033[30m"; RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"
  BLUE="\033[34m"; MAGENTA="\033[35m"; CYAN="\033[36m"; WHITE="\033[37m"
  BRIGHT_BLACK="\033[90m"; BRIGHT_RED="\033[91m"; BRIGHT_GREEN="\033[92m"
  BRIGHT_YELLOW="\033[93m"; BRIGHT_BLUE="\033[94m"; BRIGHT_MAGENTA="\033[95m"
  BRIGHT_CYAN="\033[96m"; BRIGHT_WHITE="\033[97m"
  BOLD="\033[1m"; DIM="\033[2m"; ITALIC="\033[3m"; UNDERLINE="\033[4m"
  INVERT="\033[7m"
  BG_BRIGHT_GREEN="\033[102m"; BG_BRIGHT_BLUE="\033[104m"
  BG_BRIGHT_MAGENTA="\033[105m"; BG_BRIGHT_BLACK="\033[100m"
  RESET="\033[0m"
else
  BLACK=""; RED=""; GREEN=""; YELLOW=""; BLUE=""
  MAGENTA=""; CYAN=""; WHITE=""; BRIGHT_BLACK=""
  BRIGHT_RED=""; BRIGHT_GREEN=""; BRIGHT_YELLOW=""
  BRIGHT_BLUE=""; BRIGHT_MAGENTA=""; BRIGHT_CYAN=""
  BRIGHT_WHITE=""; BOLD=""; DIM=""; ITALIC=""
  UNDERLINE=""; INVERT=""; BG_BRIGHT_GREEN=""
  BG_BRIGHT_BLUE=""; BG_BRIGHT_MAGENTA=""
  BG_BRIGHT_BLACK=""; RESET=""
fi

# ============================================
# Detect OS
# ============================================
detect_os() {
  if [[ "${WSL_DISTRO_NAME:-}" != "" ]]; then
    echo "WSL"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "LINUX"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "MAC"
  else
    echo "UNKNOWN"
  fi
}

# ============================================
# Detect shell + rcfile
# ============================================
detect_shell_rc() {
  local shell_name rcfile

  # 현재 로그인한 쉘
  shell_name="${SHELL##*/}"

  case "$shell_name" in
    bash)
      rcfile="$HOME/.bashrc"
      ;;
    zsh)
      rcfile="$HOME/.zshrc"
      ;;
    fish)
      rcfile="$HOME/.config/fish/config.fish"
      ;;
    *)
      # fallback: 기본은 bash로 가정
      shell_name="bash"
      rcfile="$HOME/.bashrc"
      ;;
  esac

  echo "$shell_name|$rcfile"
}

# ============================================
# Add export line if missing
# ============================================
add_to_rcfile() {
  local line="$1"
  local rcfile="$2"


  if grep -Fq "$line" "$rcfile" 2>/dev/null; then
    echo -e "✅ ${BRIGHT_YELLOW}PATH already configured in $rcfile${RESET}"
    echo -e " | ${GREEN}$line${RESET}"
  else
    echo -e "" >> "$rcfile"
    echo -e "# Added by rky installer" >> "$rcfile"
    echo -e "$line" >> "$rcfile"
    echo -e "${BRIGHT_MAGENTA}✅ Added rky directory to PATH in $rcfile${RESET}"
  fi
}

# ============================================
# MAIN
# ============================================
main() {
  local os shell_info shell_name rcfile
  os=$(detect_os)
  shell_info=$(detect_shell_rc)
  shell_name="${shell_info%%|*}"
  rcfile="${shell_info##*|}"

  local rky_dir
  rky_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local export_line="export PATH=\"\$PATH:${rky_dir}/bin\""

  echo -e " | ${BRIGHT_MAGENTA}Detected OS:${RESET} ${GREEN}$os${RESET}"
  echo -e " | ${BRIGHT_MAGENTA}Detected shell:${RESET} ${GREEN}$shell_name${RESET}"
  echo -e " | ${BRIGHT_MAGENTA}Rockury directory:${RESET} ${GREEN}$rky_dir${RESET}"
  echo -e " | ${BRIGHT_MAGENTA}Target RC file:${RESET} ${GREEN}$rcfile${RESET}"

  add_to_rcfile "$export_line" "$rcfile"

  # 즉시 적용
  echo -e "${BRIGHT_RED}───────────────────────────────────────────────${RESET}\n"
  echo -e "🎉 Rockury installation complete!"
  echo -e ""
  echo -e "⚠️  ${YELLOW}Please restart your terminal or run the following command to apply changes${RESET}"
  echo -e "🚀 OR you can run: ${BRIGHT_CYAN}source ${rcfile}${RESET}"
  echo -e ""
  echo -e "Check Installation:"
  echo -e "         ${CYAN}rky version${RESET}"
  echo -e ""
  echo -e "${BRIGHT_RED}───────────────────────────────────────────────${RESET}\n"
}

main "$@"
