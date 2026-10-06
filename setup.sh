#!/usr/bin/env bash
# One-time setup: git init and create the GitHub repo under rzkykhrllh.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v gh >/dev/null; then echo "Install the GitHub CLI first: brew install gh"; exit 1; fi

ACTIVE=$(gh api user --jq .login 2>/dev/null || true)
if [ "$ACTIVE" != "rzkykhrllh" ]; then
  echo "Active GitHub account is '${ACTIVE:-none}'. Switching to rzkykhrllh..."
  gh auth switch -u rzkykhrllh || gh auth login
fi

if [ ! -d .git ]; then
  git init -b main
  git add .
  git commit -m "Initial island prototype"
fi
gh repo create rzkykhrllh/pips-island --private --source=. --push
echo "Done: https://github.com/rzkykhrllh/pips-island"
