export interface Gate0Telemetry {
    cold_ingress_seconds: number;
    vram_hydration_seconds: number;
    inference_seconds_48f: number;
    total_shot_cost_usd: number;
    oom_failures_out_of_10: number;
}

export interface EvaluationResult {
    status: 'GREEN_PROCEED' | 'YELLOW_INVESTIGATE' | 'RED_HARD_STOP';
    correlated_trend_warnings: string[];
    instruction: string;
}

export function evaluateGate0(telemetry: Gate0Telemetry): EvaluationResult {
    let redCount = 0;
    let yellowCount = 0;
    const correlated_trend_warnings: string[] = [];

    // Ingress
    if (telemetry.cold_ingress_seconds > 25.0) {
        redCount++;
    } else if (telemetry.cold_ingress_seconds > 18.0) {
        yellowCount++;
    }

    // VRAM Hydration
    if (telemetry.vram_hydration_seconds > 8.0) {
        redCount++;
    } else if (telemetry.vram_hydration_seconds > 5.0) {
        yellowCount++;
    }

    // Inference 48f
    if (telemetry.inference_seconds_48f > 65.0) {
        redCount++;
    } else if (telemetry.inference_seconds_48f > 45.0) {
        yellowCount++;
    }

    // Cost USD
    if (telemetry.total_shot_cost_usd > 0.080) {
        redCount++;
    } else if (telemetry.total_shot_cost_usd > 0.060) {
        yellowCount++;
    }

    // OOM Failures
    if (telemetry.oom_failures_out_of_10 >= 2) {
        redCount++;
    } else if (telemetry.oom_failures_out_of_10 === 1) {
        yellowCount++;
    }

    // Correlated Trend Analysis
    if (yellowCount === 1 && redCount === 0) {
        // Check if mechanically linked metrics (Ingress and Cost) are within 5% of their Yellow thresholds.
        // Yellow threshold for Ingress is 18.0. 5% of 18.0 is 0.9, so 17.1 to 18.0.
        // Or perhaps it means if one is Yellow, and the other is within 5% of becoming Yellow?
        // "Check if mechanically linked metrics (Ingress and Cost) are within 5% of their Yellow thresholds."
        // Let's check if either is Yellow, and the other is within 5% of the threshold.
        const ingressYellowThreshold = 18.0;
        const costYellowThreshold = 0.060;

        const ingressIsYellow = telemetry.cold_ingress_seconds > 18.0 && telemetry.cold_ingress_seconds <= 25.0;
        const costIsYellow = telemetry.total_shot_cost_usd > 0.060 && telemetry.total_shot_cost_usd <= 0.080;

        const ingressNearYellow = telemetry.cold_ingress_seconds > ingressYellowThreshold * 0.95 && !ingressIsYellow;
        const costNearYellow = telemetry.total_shot_cost_usd > costYellowThreshold * 0.95 && !costIsYellow;

        if (ingressIsYellow && costNearYellow) {
            correlated_trend_warnings.push('Ingress is YELLOW and Cost is within 5% of becoming YELLOW.');
        } else if (costIsYellow && ingressNearYellow) {
            correlated_trend_warnings.push('Cost is YELLOW and Ingress is within 5% of becoming YELLOW.');
        }
    }

    // Multi-Metric Arbitration Matrix
    if (redCount >= 1 || yellowCount >= 2) {
        return {
            status: 'RED_HARD_STOP',
            correlated_trend_warnings,
            instruction: 'Mandatory project halt. Do not proceed.'
        };
    } else if (yellowCount === 1) {
        return {
            status: 'YELLOW_INVESTIGATE',
            correlated_trend_warnings,
            instruction: '7-day remediation spike required.'
        };
    } else {
        return {
            status: 'GREEN_PROCEED',
            correlated_trend_warnings,
            instruction: 'Unlock Gate 1.'
        };
    }
}
