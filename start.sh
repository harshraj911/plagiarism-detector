#!/bin/bash
# ─────────────────────────────────────────────────
#  PlagiScan — Start Script
#  Usage: bash start.sh
# ─────────────────────────────────────────────────

# Kill any lingering processes
pkill -f server.py || true
pkill -f "vite" || true

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
echo "  Professional Content Integrity Suite"
echo "────────────────────────────────────────────────────────"

# Check Python 3
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 is required."
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌  Node.js is required for the React frontend."
  exit 1
fi

echo "✅  Environment Audit Complete."
echo "🚀  Launching Backend (Port 5050)..."
python3 server.py &

echo "🚀  Launching Frontend (Vite)..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "📦  Installing frontend dependencies..."
  npm install
fi

# Open browser
(sleep 3 && xdg-open "http://localhost:5173" 2>/dev/null || open "http://localhost:5173" 2>/dev/null) &

npm run dev -- --port 5173
