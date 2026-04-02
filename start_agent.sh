#!/bin/bash
# Start the LangGraph sentiment analysis agent (Kafka consumer)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting SentimentPulse Sentiment Agent..."
cd "$SCRIPT_DIR"
"$SCRIPT_DIR/.venv/bin/python" agents/sentiment_agent.py
