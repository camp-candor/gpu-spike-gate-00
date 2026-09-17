#!/usr/bin/env bash
set -e

echo "Running local mock test of the harness..."

# Set up environment variables for a local mock run
export MOCK_RUN=1
export RUNPOD_HOURLY_RATE="0.74"

# Ensure tsx is available or run via npm
cd "$(dirname "$0")/.."

npx tsx harness.ts

echo "Mock test completed. Examining generated telemetry..."
ls -l /tmp/gate0_telemetry_*.json
cat /tmp/gate0_telemetry_*.json
