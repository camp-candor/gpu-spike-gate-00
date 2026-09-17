#!/bin/bash

# This script simulates or invokes a RunPod serverless endpoint.
# In a real environment, it would use the runpod python/CLI tool or curl.

RUNS=${1:-1}

echo "Triggering $RUNS runs on RunPod Serverless..."

for i in $(seq 1 $RUNS); do
    echo "Run $i: Mock invocation..."
    sleep 1
    echo "Run $i: Completed."
done

echo "All runs finished."
