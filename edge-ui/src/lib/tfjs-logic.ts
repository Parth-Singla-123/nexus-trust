"use client";

import * as tf from "@tensorflow/tfjs";

export type TxnInput = {
  amount: number;
  hour: number;
  deviceRisk: number;
  locationRisk: number;
  txnVelocity: number;
};

type Scaler = {
  feature_names: string[];
  mean: number[];
  scale: number[];
};

let modelPromise: Promise<tf.LayersModel | null> | null = null;
let scalerPromise: Promise<Scaler | null> | null = null;

const TFJS_MODEL_PATH = process.env.NEXT_PUBLIC_TFJS_MODEL_PATH ?? "/models/model.json";
const TFJS_MODEL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TFJS_MODEL === "true";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function loadModel(): Promise<tf.LayersModel | null> {
  if (!modelPromise) {
    if (!TFJS_MODEL_ENABLED) {
      modelPromise = Promise.resolve(null);
      return modelPromise;
    }

    modelPromise = tf.loadLayersModel(TFJS_MODEL_PATH).catch(() => null);
  }
  return modelPromise;
}

async function loadScaler(): Promise<Scaler | null> {
  if (!scalerPromise) {
    scalerPromise = fetch("/models/scaler.json")
      .then(async (res) => (res.ok ? ((await res.json()) as Scaler) : null))
      .catch(() => null);
  }
  return scalerPromise;
}

function heuristicScore(input: TxnInput): number {
  const score =
    0.00002 * input.amount +
    0.8 * Number(input.hour <= 4) +
    1.4 * input.deviceRisk +
    1.2 * input.locationRisk +
    0.15 * input.txnVelocity;

  return clamp(1 / (1 + Math.exp(-score + 2.2)), 0, 1);
}

export async function predictFraudProbability(input: TxnInput): Promise<number> {
  const model = await loadModel();
  const scaler = await loadScaler();

  if (!model || !scaler) {
    const fallbackScore = heuristicScore(input);
    console.log("[TFJS] Model not loaded, using heuristic:", fallbackScore);
    return fallbackScore;
  }

  // CRITICAL: Match the training preprocessing - amount must be log-transformed
  const raw = [
    Math.log1p(input.amount),  // Apply log transformation to match training data
    input.hour,
    input.deviceRisk,
    input.locationRisk,
    input.txnVelocity,
  ];

  const normalized = raw.map((value, idx) => {
    const mean = scaler.mean[idx] ?? 0;
    const scale = scaler.scale[idx] ?? 1;
    return (value - mean) / (scale || 1);
  });

  console.log("[TFJS] Raw input (amount log-transformed):", raw);
  console.log("[TFJS] Normalized input:", normalized);

  const tensor = tf.tensor2d([normalized], [1, normalized.length]);
  const output = model.predict(tensor) as tf.Tensor;
  const data = await output.data();

  const prediction = clamp(data[0], 0, 1);
  console.log("[TFJS] Raw model output:", data[0], "| Clamped:", prediction);

  tf.dispose([tensor, output]);
  return prediction;
}

export async function getInferenceMode(): Promise<"tfjs_model" | "heuristic_fallback"> {
  if (!TFJS_MODEL_ENABLED) {
    console.log("[TFJS] Model disabled via env var");
    return "heuristic_fallback";
  }

  const model = await loadModel();
  const scaler = await loadScaler();
  if (model && scaler) {
    console.log("[TFJS] Using TensorFlow.js model");
    return "tfjs_model";
  }
  console.log("[TFJS] Model or scaler failed to load, falling back to heuristic");
  return "heuristic_fallback";
  return "heuristic_fallback";
}

export function getInferenceRuntimeConfig(): {
  tfjsModelEnabled: boolean;
  tfjsModelPath: string;
} {
  return {
    tfjsModelEnabled: TFJS_MODEL_ENABLED,
    tfjsModelPath: TFJS_MODEL_PATH,
  };
}
