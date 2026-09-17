#!/bin/bash

echo "Running local mock test of harness.ts..."

# We need to mock python and s5cmd for the local CPU test if they are not available,
# but harness.ts expects them.
# The prompt requires: "Provide a mock test in scripts/test_local_mock.sh demonstrating harness.ts executing a dry run with dummy payloads, generating structured JSON, and cleanly arbitrating verdicts."

# Create a temporary directory in /tmp/mock_bin to put dummy executables
mkdir -p /tmp/mock_bin
cat << 'EOF' > /tmp/mock_bin/python3
#!/bin/bash
if [[ "$*" == *"/app/headless_runner.py"* ]]; then
    echo "[PYTORCH] Initializing VRAM hydration..."
    echo "VRAM_HYDRATION_MS:2500"
    mkdir -p /tmp/renders
    touch /tmp/renders/test_plate.mp4
    sleep 2 # mock compute time
    exit 0
fi
EOF
chmod +x /tmp/mock_bin/python3

cat << 'EOF' > /tmp/mock_bin/s5cmd
#!/bin/bash
sleep 1 # mock ingress/egress time
exit 0
EOF
chmod +x /tmp/mock_bin/s5cmd

# Export path to use our mock binaries
export PATH="/tmp/mock_bin:$PATH"

# Install tsx globally or locally to run
npm install

# Run the benchmark
npm run benchmark

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "Mock test passed! Result: GREEN_PROCEED"
elif [ $EXIT_CODE -eq 1 ]; then
    echo "Mock test resulted in: YELLOW_INVESTIGATE"
elif [ $EXIT_CODE -eq 2 ]; then
    echo "Mock test resulted in: RED_HARD_STOP"
else
    echo "Mock test failed with unknown exit code: $EXIT_CODE"
fi

# Print the generated telemetry JSON
cat /tmp/gate0_telemetry_*.json
rm -f /tmp/gate0_telemetry_*.json
rm -rf /tmp/mock_bin

exit $EXIT_CODE
