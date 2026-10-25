#!/bin/sh
# Nexus Console — setup script for Fedora Workstation.
#
#   sh scripts/setup-fedora.sh          install whatever is missing (asks before each step)
#   sh scripts/setup-fedora.sh --yes    don't ask, just install
#   sh scripts/setup-fedora.sh --check  report only, install nothing

set -u

MODE=install
YES=0
for arg in "$@"; do
  case "$arg" in
    --check) MODE=check ;;
    -y | --yes) YES=1 ;;
    *) echo "unknown option: $arg" && exit 2 ;;
  esac
done

[ -t 0 ] || MODE=check

fail=0
pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
miss() {
  printf '  \033[31m✗\033[0m %s\n      fix: %s\n' "$1" "$2"
  fail=$((fail + 1))
}

ask() {
  [ "$MODE" = check ] && return 1
  [ "$YES" = 1 ] && return 0
  printf '  \033[33m?\033[0m %s [Y/n] ' "$1"
  read -r reply
  case "$reply" in n | N | no | NO) return 1 ;; *) return 0 ;; esac
}

echo "Nexus Console — Fedora Setup"

# 1. Core build tools and GTK/WebKit libraries for Tauri
DNF_PKGS="gcc gcc-c++ make webkit2gtk4.1-devel openssl-devel libayatana-appindicator-gtk3-devel librsvg2-devel lsof"

check_pkg() {
  rpm -q "$1" >/dev/null 2>&1
}

missing_pkgs=""
for pkg in $DNF_PKGS; do
  if check_pkg "$pkg"; then
    :
  else
    missing_pkgs="$missing_pkgs $pkg"
  fi
done

if [ -z "$missing_pkgs" ]; then
  pass "Development libraries & tools ($DNF_PKGS)"
else
  if ask "Install required system packages with sudo dnf?$missing_pkgs"; then
    sudo dnf install -y $missing_pkgs
    pass "Installed: $missing_pkgs"
  else
    miss "System packages missing" "sudo dnf install -y$missing_pkgs"
  fi
fi

# 2. GNOME AppIndicator extension (optional, recommended for system tray on Fedora)
if rpm -q gnome-shell-extension-appindicator >/dev/null 2>&1; then
  pass "GNOME AppIndicator extension"
else
  warn "gnome-shell-extension-appindicator not installed (system tray icon may be hidden in GNOME)"
  if ask "Install GNOME AppIndicator extension for tray icon?"; then
    sudo dnf install -y gnome-shell-extension-appindicator
    pass "Installed gnome-shell-extension-appindicator"
  fi
fi

# 3. Node >= 22.12
node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [M,m]=process.versions.node.split(".").map(Number);process.exit(M>22||(M===22&&m>=12)?0:1)'
}

if node_ok; then
  pass "Node $(node --version)"
else
  miss "Node >= 22.12" "Install Node via nvm or fnm or 'sudo dnf install nodejs'"
fi

# 4. Rust Toolchain
if command -v cargo >/dev/null 2>&1 && command -v rustc >/dev/null 2>&1; then
  pass "Rust toolchain ($(rustc --version))"
else
  if ask "Install Rust via rustup?"; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    . "$HOME/.cargo/env"
    pass "Rust installed"
  else
    miss "Rust (cargo & rustc)" "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  fi
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "All prerequisites met! You can now run:"
  echo "  npm install"
  echo "  npm start"
else
  echo "Setup incomplete: $fail item(s) need attention."
  exit 1
fi
