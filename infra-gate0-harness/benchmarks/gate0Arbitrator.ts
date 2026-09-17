export interface Gate0Telemetry {
    cold_ingress_seconds: number;
    vram_hydration_seconds: number;
    inference_seconds_48f: number;
    total_shot_cost_usd: number;
    oom_failures_out_of_10: number;
    correlated_trend_warnings?: string[];
}

export type Verdict = 'GREEN_PROCEED' | 'YELLOW_INVESTIGATE' | 'RED_HARD_STOP';

export function evaluateGate0(telemetry: Gate0Telemetry): Verdict {
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;

    // Ingress
    if (telemetry.cold_ingress_seconds <= 18.0) greenCount++;
    else if (telemetry.cold_ingress_seconds <= 25.0) yellowCount++;
    else redCount++;

    // VRAM Hydration
    if (telemetry.vram_hydration_seconds <= 5.0) greenCount++;
    else if (telemetry.vram_hydration_seconds <= 8.0) yellowCount++;
    else redCount++;

    // Inference 48f
    if (telemetry.inference_seconds_48f <= 45.0) greenCount++;
    else if (telemetry.inference_seconds_48f <= 65.0) yellowCount++;
    else redCount++;

    // Cost USD
    if (telemetry.total_shot_cost_usd <= 0.060) greenCount++;
    else if (telemetry.total_shot_cost_usd <= 0.080) yellowCount++;
    else redCount++;

    // OOM Failures
    if (telemetry.oom_failures_out_of_10 === 0) greenCount++;
    else if (telemetry.oom_failures_out_of_10 === 1) yellowCount++;
    else redCount++;

    // Correlated Trend Analysis
    if (yellowCount === 1 && redCount === 0) {
        // Check if mechanically linked metrics (Ingress and Cost) are within 5% of their Yellow thresholds.
        // Ingress Yellow threshold lower bound is 18.1s, upper is 25.0s. "Within 5% of their Yellow thresholds"
        // typically means within 5% of the boundary.
        const ingressMargin = 18.0 * 1.05;
        const costMargin = 0.060 * 1.05;

        telemetry.correlated_trend_warnings = [];
        if (telemetry.cold_ingress_seconds > 18.0 && telemetry.cold_ingress_seconds <= ingressMargin) {
            telemetry.correlated_trend_warnings.push('Ingress within 5% of Yellow threshold');
        }
        if (telemetry.total_shot_cost_usd > 0.060 && telemetry.total_shot_cost_usd <= costMargin) {
            telemetry.correlated_trend_warnings.push('Cost within 5% of Yellow threshold');
        }
    }

    if (redCount >= 1 || yellowCount >= 2) {
        console.warn('MANDATORY PROJECT HALT INSTRUCTION: Gate 0 Failed');
        return 'RED_HARD_STOP';
    }

    if (yellowCount === 1) {
        console.warn('7-DAY REMEDIATION SPIKE INSTRUCTION: Gate 0 Warning');
        return 'YELLOW_INVESTIGATE';
    }

    console.log('UNLOCK GATE 1: Gate 0 Passed');
    return 'GREEN_PROCEED';
}
