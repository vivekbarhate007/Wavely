#!/bin/bash
# Start the Reddit scraper service (port 8001)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$SCRIPT_DIR/.venv/bin/python"

echo "Starting SentimentPulse Scraper Service on port 8001..."
cd "$SCRIPT_DIR/backend/scraper_service"
"$SCRIPT_DIR/.venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8001 --reload
