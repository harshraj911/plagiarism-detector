#!/bin/bash
# ─────────────────────────────────────────────────
#  PlagiScan — Start Script
#  Usage: bash start.sh
# ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  ██████╗ ██╗      █████╗  ██████╗ ██╗███████╗ ██████╗ █████╗ ███╗   ██╗"
echo "  ██╔══██╗██║     ██╔══██╗██╔════╝ ██║██╔════╝██╔════╝██╔══██╗████╗  ██║"
echo "  ██████╔╝██║     ███████║██║  ███╗██║███████╗██║     ███████║██╔██╗ ██║"
echo "  ██╔═══╝ ██║     ██╔══██║██║   ██║██║╚════██║██║     ██╔══██║██║╚██╗██║"
echo "  ██║     ███████╗██║  ██║╚██████╔╝██║███████║╚██████╗██║  ██║██║ ╚████║"
echo "  ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝"
echo ""
echo "  AI Plagiarism Detector · Powered by Copyleaks"
echo "────────────────────────────────────────────────────────"

# Check Python 3
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 is required. Install it with: sudo apt install python3"
  exit 1
fi

echo "✅  Python 3 found: $(python3 --version)"
echo "🚀  Starting server on http://localhost:5050 …"
echo "────────────────────────────────────────────────────────"
echo ""

# Open browser after a short delay
(sleep 2 && xdg-open "http://localhost:5050" 2>/dev/null || open "http://localhost:5050" 2>/dev/null) &

python3 server.py
