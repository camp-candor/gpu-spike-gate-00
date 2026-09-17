# infra-gate0-harness

## The 48-Hour Falsification Scope
This repository implements **Gate 0: The 48-Hour GPU & Hydration Spike** from the pipeline gauntlet.
Its single operational purpose is to empirically measure cold-start network ingress, VRAM hydration, and multi-frame tensor execution on ephemeral RunPod Serverless GPUs pulling model weights from Cloudflare R2 before any creative work occurs.

## Pre-registered Thresholds Table

| Metric | Green | Yellow | Red |
| :--- | :--- | :--- | :--- |
| Ingress | <= 18.0s | 18.1s - 25.0s | > 25.0s |
| VRAM Hydration | <= 5.0s | 5.1s - 8.0s | > 8.0s |
| Inference 48f | <= 45.0s | 45.1s - 65.0s | > 65.0s |
| Cost USD | <= $0.060 | $0.061 - $0.080 | > $0.080 |
| OOM Failures | 0/10 | 1/10 | >= 2/10 |

## Multi-Metric Arbitration Matrix
* `>= 1` Red OR `>= 2` Yellows: `RED_HARD_STOP` (Mandatory project halt instruction).
* Exactly 1 Yellow: `YELLOW_INVESTIGATE` (7-day remediation spike instruction).
* 0 Yellows, 0 Reds: `GREEN_PROCEED` (Unlock Gate 1).

## Instructions

### Pushing the Docker image
1. Build the image: `docker build -t your-dockerhub-user/infra-gate0-harness:latest .`
2. Push the image: `docker push your-dockerhub-user/infra-gate0-harness:latest`

### RunPod Serverless Template Environment Variables
Ensure the following are set when configuring your RunPod serverless template:
* `R2_ENDPOINT_URL`: Your Cloudflare R2 endpoint
* `R2_BUCKET`: The name of your R2 bucket
* `AWS_ACCESS_KEY_ID`: Your access key
* `AWS_SECRET_ACCESS_KEY`: Your secret key
* `CHECKPOINT_KEY`: Defaults to `checkpoints/wan2.2_i2v_14b.safetensors`
* `RUNPOD_HOURLY_RATE`: Defaults to `0.74`

## Mandatory Postmortem Checklist
1. Did we hit the ingress thresholds?
2. Was VRAM hydration within limits?
3. Did inference speed meet expectations?
4. Is the cost per shot viable?
5. Were there any OOM errors?
6. Are any mechanical links (e.g. ingress and cost) showing correlated negative trends?
7. Did the mock validation pass locally?
8. Are we ready for Gate 1?
9. Have all stakeholders reviewed the arbitration output?
