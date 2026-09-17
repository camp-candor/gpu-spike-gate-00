# infra-gate0-harness (The 48-Hour GPU & Hydration Spike)

## 1. The 48-Hour Falsification Scope
This repository implements **Gate 0: The 48-Hour GPU & Hydration Spike** from the pipeline gauntlet.
Its single operational purpose is to empirically measure cold-start network ingress, VRAM hydration, and multi-frame tensor execution on ephemeral RunPod Serverless GPUs pulling model weights from Cloudflare R2.
Zero creative or lore generation is handled here.

## 2. Pre-registered Thresholds Table

| Metric | Green | Yellow | Red |
|---|---|---|---|
| Ingress | $\le 18.0\text{s}$ | $18.1\text{s}-25.0\text{s}$ | $> 25.0\text{s}$ |
| VRAM Hydration | $\le 5.0\text{s}$ | $5.1\text{s}-8.0\text{s}$ | $> 8.0\text{s}$ |
| Inference 48f | $\le 45.0\text{s}$ | $45.1\text{s}-65.0\text{s}$ | $> 65.0\text{s}$ |
| Cost USD | $\le \$0.060$ | $\$0.061-\$0.080$ | $> \$0.080$ |
| OOM Failures | $0/10$ | $1/10$ | $\ge 2/10$ |

## 3. Run Instructions

### Building and Pushing Docker Image
```bash
docker build -t your-docker-registry/infra-gate0-harness:latest .
docker push your-docker-registry/infra-gate0-harness:latest
```

### Setting RunPod Serverless Template Variables
Set the following environment variables in your RunPod serverless template:
* `R2_ENDPOINT_URL`: Your Cloudflare R2 S3-compatible API endpoint
* `R2_BUCKET`: Your R2 bucket name
* `AWS_ACCESS_KEY_ID`: Your R2 Access Key ID
* `AWS_SECRET_ACCESS_KEY`: Your R2 Secret Access Key
* `CHECKPOINT_KEY`: Key of the model weights in the bucket (e.g. `checkpoints/wan2.2_i2v_14b.safetensors`)
* `RUNPOD_HOURLY_RATE`: Hourly rate of the GPU (e.g. `0.74`)

## 4. Postmortem Checklist

1. Did the run complete without OOMs?
2. Did ingress stay within acceptable limits?
3. Was the VRAM hydration within acceptable latency limits?
4. Are all metrics mechanically decoupled from unrelated artifacts?
5. Did the deterministic arbitrator output exactly what was expected based on telemetry?
6. Are correlated trends accurately representing the underlying infrastructure state?
7. Have all outputs been written successfully to the remote bucket?
8. Has the run cost exceeded the maximum permitted cost boundary?
9. Is Gate 1 clear to unlock based on arbitration results?
