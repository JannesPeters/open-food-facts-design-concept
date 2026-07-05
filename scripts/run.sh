#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Dependencies are missing. Run ./scripts/install.sh first." >&2
  exit 1
fi

echo "Starting the app on http://localhost:5173 ..."
npm run dev -- --host 0.0.0.0
