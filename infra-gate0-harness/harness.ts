import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { evaluateGate0, Gate0Telemetry } from './benchmarks/gate0Arbitrator.js';

async function runCommand(command: string, args: string[], env: Record<string, string | undefined>): Promise<{ stdout: string, stderr: string, code: number | null }> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, { env: { ...process.env, ...env } });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());

        proc.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });
    });
}

async function main() {
    const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL;
    const R2_BUCKET = process.env.R2_BUCKET;
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const CHECKPOINT_KEY = process.env.CHECKPOINT_KEY || 'checkpoints/wan2.2_i2v_14b.safetensors';
    const RUNPOD_HOURLY_RATE = parseFloat(process.env.RUNPOD_HOURLY_RATE || '0.74');

    if (!R2_ENDPOINT_URL || !R2_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
        // Skip for local mock testing if missing but allow mock script to pass by creating dummy data
        if (process.env.MOCK_RUN === '1') {
            console.log('Running in MOCK mode...');
        } else {
            console.error('Missing required R2/AWS environment variables.');
            process.exit(1);
        }
    }

    const RUN_ID = randomUUID();

    await mkdir('/tmp/models', { recursive: true });
    await mkdir('/tmp/renders', { recursive: true });

    const startTime = process.hrtime.bigint();
    let ingressTimeSeconds = 0;

    // Phase 1: Ingress
    if (process.env.MOCK_RUN !== '1') {
        const ingressStart = process.hrtime.bigint();
        const { code: s5cmdCode } = await runCommand('s5cmd', [
            '--endpoint-url', R2_ENDPOINT_URL as string,
            'sync', '--concurrency', '64', '--part-size', '50',
            `s3://${R2_BUCKET}/${CHECKPOINT_KEY}`, '/tmp/models/'
        ], {});
        const ingressEnd = process.hrtime.bigint();
        ingressTimeSeconds = Number(ingressEnd - ingressStart) / 1e9;

        if (s5cmdCode !== 0) {
            console.error('s5cmd ingress failed');
            process.exit(1);
        }
    } else {
        ingressTimeSeconds = 15.0; // Mock 15s ingress
    }

    // Phase 2 & 3: VRAM & Tensor Inference
    let vramHydrationMs = 0;
    let inferenceSeconds = 0;
    let oomFailures = 0;

    const inferenceStart = process.hrtime.bigint();

    const pythonCmd = process.env.MOCK_RUN === '1' ? 'echo' : 'python3';
    const pythonArgs = process.env.MOCK_RUN === '1' ? ['VRAM_HYDRATION_MS:4000'] : [
        '/app/headless_runner.py',
        '--model-path', `/tmp/models/${CHECKPOINT_KEY.split('/').pop()}`,
        '--frames', '48',
        '--output', '/tmp/renders/test_plate.mp4'
    ];

    const { stdout: pyStdout, stderr: pyStderr, code: pyCode } = await runCommand(pythonCmd, pythonArgs, {});

    if (process.env.MOCK_RUN === '1') {
        vramHydrationMs = 4000;
        inferenceSeconds = 40.0;
        await writeFile('/tmp/renders/test_plate.mp4', 'dummy data');
    } else {
        if (pyCode === 137 || pyStderr.includes('FATAL: CUDA_OOM_DETECTED')) {
            oomFailures = 1;
        }

        const match = pyStdout.match(/VRAM_HYDRATION_MS:(\d+)/);
        if (match) {
            vramHydrationMs = parseInt(match[1], 10);
        }

        const inferenceEnd = process.hrtime.bigint();
        inferenceSeconds = Number(inferenceEnd - inferenceStart) / 1e9;
    }

    // Phase 4: Egress
    if (process.env.MOCK_RUN !== '1') {
        const { code: egressCode } = await runCommand('s5cmd', [
            '--endpoint-url', R2_ENDPOINT_URL as string,
            'cp', '/tmp/renders/test_plate.mp4', `s3://${R2_BUCKET}/outputs/gate0_${RUN_ID}.mp4`
        ], {});

        if (egressCode !== 0) {
            console.error('s5cmd egress failed');
        }
    }

    const endTime = process.hrtime.bigint();
    const totalSeconds = Number(endTime - startTime) / 1e9;
    const totalShotCostUsd = totalSeconds * (RUNPOD_HOURLY_RATE / 3600.0);

    const telemetry: Gate0Telemetry = {
        cold_ingress_seconds: ingressTimeSeconds,
        vram_hydration_seconds: vramHydrationMs / 1000.0,
        inference_seconds_48f: inferenceSeconds,
        total_shot_cost_usd: totalShotCostUsd,
        oom_failures_out_of_10: oomFailures * 10 // Extrapolated or taken as 10 per run? "oom_failures_out_of_10"
        // If pyCode == 137, let's treat it as 10/10 failed. Or maybe it runs 10 times? The instructions say "oom_failures_out_of_10" so we'll just set it to 10 if failed, 0 if success. Or we can just set it to 10 if it failed once for this test.
    };

    if (oomFailures > 0) {
        telemetry.oom_failures_out_of_10 = 10;
    }

    const result = evaluateGate0(telemetry);

    await writeFile(`/tmp/gate0_telemetry_${RUN_ID}.json`, JSON.stringify({
        run_id: RUN_ID,
        telemetry,
        verdict: result
    }, null, 2));

    console.log(`Gate 0 Run Complete. Verdict: ${result}`);
    if (result === 'GREEN_PROCEED') process.exit(0);
    if (result === 'YELLOW_INVESTIGATE') process.exit(1);
    process.exit(2); // RED_HARD_STOP
}

main().catch(console.error);
